import os
import json
import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mobilenet_preprocess

# Load calibration and threshold constants
TEMPERATURE = 0.8037
REJECTION_THRESHOLD = 0.6234
MODEL_NAME = "MobileNetV2"
MODEL_VERSION = "1.0.0"
INPUT_SIZE = 224

# Scientific and common name mappings
CLASS_SCIENTIFIC_MAP = {
    "Aloevera": ("Aloe vera", "Aloe Vera"),
    "Amla": ("Phyllanthus emblica", "Amla"),
    "Amruta_Balli": ("Tinospora cordifolia", "Heart-leaved Moonseed"),
    "Arali": ("Nerium oleander", "Oleander"),
    "Ashoka": ("Saraca asoca", "Ashoka"),
    "Ashwagandha": ("Withania somnifera", "Ashwagandha"),
    "Avacado": ("Persea americana", "Avocado"),
    "Bamboo": ("Bambusa vulgaris", "Bamboo"),
    "Basale": ("Basella alba", "Malabar Spinach"),
    "Betel": ("Piper betle", "Betel"),
    "Betel_Nut": ("Areca catechu", "Betel Nut"),
    "Brahmi": ("Bacopa monnieri", "Brahmi"),
    "Castor": ("Ricinus communis", "Castor"),
    "Curry_Leaf": ("Murraya koenigii", "Curry Leaf"),
    "Doddapatre": ("Coleus amboinicus", "Doddapatre"),
    "Ekka": ("Calotropis gigantea", "Crown Flower"),
    "Ganike": ("Solanum nigrum", "Black Nightshade"),
    "Gauva": ("Psidium guajava", "Guava"),
    "Geranium": ("Pelargonium graveolens", "Geranium"),
    "Henna": ("Lawsonia inermis", "Henna"),
    "Hibiscus": ("Hibiscus rosa-sinensis", "Hibiscus"),
    "Honge": ("Pongamia pinnata", "Honge"),
    "Insulin": ("Costus igneus", "Insulin Plant"),
    "Jasmine": ("Jasminum auriculatum", "Jasmine"),
    "Lemon": ("Citrus limon", "Lemon"),
    "Lemon_grass": ("Cymbopogon citratus", "Lemon Grass"),
    "Mango": ("Mangifera indica", "Mango"),
    "Mint": ("Mentha arvensis", "Mint"),
    "Nagadali": ("Ruta graveolens", "Nagadali"),
    "Neem": ("Azadirachta indica", "Neem"),
    "Nithyapushpa": ("Catharanthus roseus", "Madagascar Periwinkle"),
    "Nooni": ("Morinda citrifolia", "Noni"),
    "Pappaya": ("Carica papaya", "Papaya"),
    "Pepper": ("Piper nigrum", "Pepper"),
    "Pomegranate": ("Punica granatum", "Pomegranate"),
    "Raktachandini": ("Caesalpinia sappan", "Raktachandini"),
    "Rose": ("Rosa indica", "Rose"),
    "Sapota": ("Manilkara zapota", "Sapota"),
    "Tulasi": ("Ocimum tenuiflorum", "Tulsi"),
    "Wood_sorel": ("Oxalis corniculata", "Wood Sorrel")
}


class InferenceService:
    def __init__(self):
        self.model = None
        self.class_mapping = {}
        self.classes_by_index = {}

    def load_model_and_mapping(self, root_dir: str):
        """Loads model and class mappings from files."""
        model_path = os.path.join(root_dir, "training", "models", "mobilenetv2", "mobilenetv2_best.keras")
        class_map_path = os.path.join(root_dir, "training", "models", "mobilenetv2", "class_mapping.json")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}")
        if not os.path.exists(class_map_path):
            raise FileNotFoundError(f"Class mapping file not found at {class_map_path}")

        print(f"Loading Keras model from {model_path}...")
        self.model = tf.keras.models.load_model(model_path, compile=False)
        print("Model loaded successfully.")

        with open(class_map_path, "r", encoding="utf-8") as f:
            mapping = json.load(f)
            # mapping is {"0": "Aloevera", ...}
            self.class_mapping = {int(k): v for k, v in mapping.items()}
            self.classes_by_index = mapping

    def preprocess_image(self, pil_image: Image.Image) -> np.ndarray:
        """Resizes to 224x224 RGB and applies MobileNetV2 preprocessing."""
        # Ensure RGB
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        
        # Resize
        pil_image = pil_image.resize((INPUT_SIZE, INPUT_SIZE), Image.Resampling.BILINEAR)
        img_array = np.array(pil_image, dtype=np.float32)
        
        # Add batch dimension and preprocess
        img_array = np.expand_dims(img_array, axis=0)
        img_array = mobilenet_preprocess(img_array)
        return img_array

    def predict(self, pil_image: Image.Image) -> dict:
        """
        Runs model inference, applies calibration (temperature scaling),
        and applies OOD rejection thresholds.
        """
        if self.model is None:
            raise RuntimeError("Model is not loaded. Call load_model_and_mapping first.")

        # Preprocess
        img_array = self.preprocess_image(pil_image)

        # 1) Softmax prediction (raw probability)
        raw_probs = self.model.predict(img_array, verbose=0)[0]

        # 2) Calculate logits
        # logits = log(clip(raw_probability, 1e-12, 1.0))
        logits = np.log(np.clip(raw_probs, 1e-12, 1.0))

        # 3) Calibrate logits: calibrated_logits = logits / 0.8126
        calibrated_logits = logits / TEMPERATURE

        # 4) Calibrated probabilities: calibrated_probability = softmax(calibrated_logits)
        exp_logits = np.exp(calibrated_logits)
        calibrated_probs = exp_logits / np.sum(exp_logits)

        # Top index
        top_index = int(np.argmax(calibrated_probs))
        raw_conf = float(raw_probs[top_index])
        calibrated_conf = float(calibrated_probs[top_index])
        predicted_class_label = self.class_mapping[top_index]

        # Scientific and common name
        sci_name, common_name = CLASS_SCIENTIFIC_MAP.get(predicted_class_label, ("Unknown", "Unknown"))

        # Rejection: max(calibrated_probability) < 0.5982
        rejected = calibrated_conf < REJECTION_THRESHOLD

        # Sort predictions for Top-K
        sorted_indices = np.argsort(calibrated_probs)[::-1]
        top_predictions = []
        for rank, idx in enumerate(sorted_indices):
            c_label = self.class_mapping[int(idx)]
            c_sci, c_comm = CLASS_SCIENTIFIC_MAP.get(c_label, ("Unknown", "Unknown"))
            top_predictions.append({
                "rank": rank + 1,
                "class": c_label,
                "scientificName": c_sci,
                "commonName": c_comm,
                "rawConfidence": float(raw_probs[int(idx)]),
                "calibratedConfidence": float(calibrated_probs[int(idx)])
            })

        result = {
            "prediction": {
                "class": "Unknown" if rejected else predicted_class_label,
                "scientificName": "Unknown" if rejected else sci_name,
                "commonName": "Unknown" if rejected else common_name,
                "rawConfidence": raw_conf,
                "calibratedConfidence": calibrated_conf,
                "rejected": rejected,
                "rejectionThreshold": REJECTION_THRESHOLD,
                "topPredictions": top_predictions,
                "candidate": {
                    "class": predicted_class_label,
                    "scientificName": sci_name,
                    "commonName": common_name,
                }
            },
            "model": {
                "name": MODEL_NAME,
                "version": MODEL_VERSION,
                "inputSize": f"{INPUT_SIZE}x{INPUT_SIZE}"
            }
        }

        if rejected:
            result["prediction"]["uncertaintyMessage"] = (
                "Unable to confidently identify this plant from the provided image. "
                "Try uploading a clear close-up photograph of the leaf."
            )
            result["prediction"]["rejectionReason"] = "Calibrated confidence score falls below the rejection threshold."

        return result, img_array, top_index
