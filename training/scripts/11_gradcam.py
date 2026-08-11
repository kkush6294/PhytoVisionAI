"""
11_gradcam.py
=============
Genuine Grad-CAM explainability for the production model (Phase 14).

This computes real gradients with respect to the actual convolutional
feature maps of the trained model. No simulated/fake heatmaps.

For each image:
  1. Preprocess with the model's official preprocess_input.
  2. Forward pass to get the predicted class logits.
  3. Compute gradients of the predicted-class score w.r.t. the last
     convolutional feature maps.
  4. Grad-CAM = ReLU( sum_k alpha_k * A_k )  (alpha = global-avg-pooled grads)
  5. Upsample heatmap to input size and overlay on the original image.

The script produces sample Grad-CAM visualisations from the TEST set and
also writes a reusable function used by the AI-service / frontend.
"""
import os
import json
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt

from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input


MODEL_PATH = "training/models/mobilenetv2/mobilenetv2_best.keras"
DATASET_DIR = "dataset/final_split/test"
OUTPUT_DIR = "research/figures/models/gradcam"
REPORT_DIR = "reports/models/gradcam"

IMG_SIZE = (224, 224)

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)


def get_class_names():
    return sorted(
        d for d in os.listdir(DATASET_DIR)
        if os.path.isdir(os.path.join(DATASET_DIR, d))
    )


def find_sample_image():
    for class_name in get_class_names():
        class_dir = os.path.join(DATASET_DIR, class_name)

        for filename in sorted(os.listdir(class_dir)):
            if filename.lower().endswith((".jpg", ".jpeg", ".png")):
                return os.path.join(class_dir, filename)

    raise RuntimeError("No test image found.")


def make_gradcam(model, img_array, class_index):

    backbone = model.get_layer("mobilenetv2_1.00_224")
    target_layer = backbone.get_layer("Conv_1")

    with tf.GradientTape() as tape:

        # Explicitly run the backbone while capturing Conv_1
        x = backbone.input

        target_model = tf.keras.Model(
            inputs=backbone.input,
            outputs=[
                target_layer.output,
                backbone.output
            ]
        )

        conv_output, backbone_output = target_model(img_array, training=False)

        # Recreate the classification head exactly as saved
        x = backbone_output

        for layer_name in [
            "dropout",
            "dense",
            "dropout_1",
            "classifier"
        ]:
            layer = model.get_layer(layer_name)
            x = layer(x, training=False)

        predictions = x

        class_score = predictions[:, class_index]

    gradients = tape.gradient(
        class_score,
        conv_output
    )

    if gradients is None:
        raise RuntimeError(
            "Gradients are None. Grad-CAM could not be computed."
        )

    pooled_gradients = tf.reduce_mean(
        gradients,
        axis=(1, 2)
    )

    conv_output = conv_output[0]
    pooled_gradients = pooled_gradients[0]

    heatmap = tf.reduce_sum(
        conv_output * pooled_gradients,
        axis=-1
    )

    heatmap = tf.maximum(heatmap, 0)

    max_value = tf.reduce_max(heatmap)

    heatmap = tf.where(
        max_value > 0,
        heatmap / max_value,
        heatmap
    )

    return heatmap.numpy()


def create_overlay(original, heatmap):

    heatmap_resized = tf.image.resize(
        heatmap[..., np.newaxis],
        original.shape[:2]
    ).numpy().squeeze()

    heatmap_uint8 = np.uint8(
        255 * heatmap_resized
    )

    heatmap_color = plt.get_cmap("jet")(
        heatmap_uint8 / 255.0
    )[:, :, :3]

    original_float = original / 255.0

    overlay = (
        0.6 * original_float
        + 0.4 * heatmap_color
    )

    return np.clip(overlay, 0, 1)


def main():

    print("Loading MobileNetV2 model...")

    model = load_model(
        MODEL_PATH,
        compile=False
    )

    print("Model loaded.")

    backbone = model.get_layer(
        "mobilenetv2_1.00_224"
    )

    target_layer = backbone.get_layer(
        "Conv_1"
    )

    print(
        "Grad-CAM backbone:",
        backbone.name
    )

    print(
        "Grad-CAM target layer:",
        target_layer.name
    )

    print(
        "Target layer output:",
        target_layer.output.shape
    )

    if len(target_layer.output.shape) != 4:
        raise RuntimeError(
            "Target layer is not a 4D convolutional feature map."
        )

    sample_path = find_sample_image()

    print(
        "Sample image:",
        sample_path
    )

    original = image.load_img(
        sample_path,
        target_size=IMG_SIZE
    )

    original_array = image.img_to_array(
        original
    )

    img_array = np.expand_dims(
        original_array.copy(),
        axis=0
    )

    img_array = preprocess_input(
        img_array
    )

    predictions = model.predict(
        img_array,
        verbose=0
    )[0]

    predicted_index = int(
        np.argmax(predictions)
    )

    confidence = float(
        predictions[predicted_index]
    )

    class_names = get_class_names()

    predicted_class = class_names[
        predicted_index
    ]

    print(
        "Predicted class:",
        predicted_class
    )

    print(
        "Raw confidence:",
        confidence
    )

    heatmap = make_gradcam(
        model,
        img_array,
        predicted_index
    )

    overlay = create_overlay(
        original_array,
        heatmap
    )

    base_name = os.path.splitext(
        os.path.basename(sample_path)
    )[0]

    original_path = os.path.join(
        OUTPUT_DIR,
        f"{base_name}_original.png"
    )

    heatmap_path = os.path.join(
        OUTPUT_DIR,
        f"{base_name}_heatmap.png"
    )

    overlay_path = os.path.join(
        OUTPUT_DIR,
        f"{base_name}_gradcam.png"
    )

    metadata_path = os.path.join(
        REPORT_DIR,
        f"{base_name}_metadata.json"
    )

    plt.figure(figsize=(6, 6))
    plt.imshow(
        original_array.astype(np.uint8)
    )
    plt.axis("off")
    plt.title(
        f"{predicted_class} | {confidence:.2%}"
    )
    plt.tight_layout()
    plt.savefig(
        original_path,
        dpi=300,
        bbox_inches="tight"
    )
    plt.close()

    plt.figure(figsize=(6, 6))
    plt.imshow(
        heatmap,
        cmap="jet"
    )
    plt.axis("off")
    plt.title("Grad-CAM Heatmap")
    plt.tight_layout()
    plt.savefig(
        heatmap_path,
        dpi=300,
        bbox_inches="tight"
    )
    plt.close()

    plt.figure(figsize=(6, 6))
    plt.imshow(overlay)
    plt.axis("off")
    plt.title(
        f"Grad-CAM | {predicted_class} | {confidence:.2%}"
    )
    plt.tight_layout()
    plt.savefig(
        overlay_path,
        dpi=300,
        bbox_inches="tight"
    )
    plt.close()

    metadata = {
        "model": "MobileNetV2",
        "model_path": MODEL_PATH,
        "sample_image": sample_path,
        "predicted_class": predicted_class,
        "predicted_class_index": predicted_index,
        "raw_confidence": confidence,
        "gradcam_method": "Grad-CAM",
        "backbone": backbone.name,
        "target_layer": target_layer.name,
        "target_layer_output": [None, 7, 7, 1280],
        "artificial_heatmap": False,
        "preprocessing": "MobileNetV2 preprocess_input"
    }

    with open(
        metadata_path,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            metadata,
            f,
            indent=2
        )

    print()
    print("Grad-CAM completed successfully.")
    print("Target layer:", target_layer.name)
    print("Predicted:", predicted_class)
    print(
        "Confidence:",
        f"{confidence:.4f}"
    )
    print("Original:", original_path)
    print("Heatmap:", heatmap_path)
    print("Overlay:", overlay_path)
    print("Metadata:", metadata_path)


if __name__ == "__main__":
    main()