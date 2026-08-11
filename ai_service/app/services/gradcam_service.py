import io
import base64
import numpy as np
import tensorflow as tf
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

class GradcamService:
    @staticmethod
    def generate_gradcam(model, preprocessed_img: np.ndarray, original_img: Image.Image, class_index: int) -> dict:
        """
        Computes a genuine Grad-CAM heatmap and overlay for the predicted class.
        Returns base64 encoded strings for original, heatmap, and overlay images.
        """
        try:
            # 1) Recreate Grad-CAM logic from 11_gradcam.py
            backbone = model.get_layer("mobilenetv2_1.00_224")
            target_layer = backbone.get_layer("Conv_1")

            # Extract intermediate features and final output from backbone
            target_model = tf.keras.Model(
                inputs=backbone.input,
                outputs=[target_layer.output, backbone.output]
            )

            with tf.GradientTape() as tape:
                conv_output, backbone_output = target_model(preprocessed_img, training=False)
                
                # Forward pass through classification head
                x = backbone_output
                for layer_name in ["dropout", "dense", "dropout_1", "classifier"]:
                    layer = model.get_layer(layer_name)
                    x = layer(x, training=False)
                
                predictions = x
                class_score = predictions[:, class_index]

            # 2) Compute gradients
            gradients = tape.gradient(class_score, conv_output)
            if gradients is None:
                raise RuntimeError("Gradients are None. Target layer might not be differentiable.")

            # 3) Compute weights (global average pooling of gradients)
            pooled_gradients = tf.reduce_mean(gradients, axis=(1, 2))
            
            # Slice batch dimension
            conv_output = conv_output[0]
            pooled_gradients = pooled_gradients[0]

            # 4) Compute weighted sum of feature maps (Relu(sum_k w_k A_k))
            heatmap = tf.reduce_sum(conv_output * pooled_gradients, axis=-1)
            heatmap = tf.maximum(heatmap, 0)
            
            # Normalize
            max_val = tf.reduce_max(heatmap)
            heatmap = tf.where(max_val > 0, heatmap / max_val, heatmap).numpy()

            # 5) Resize and map heatmap using Matplotlib jet color map
            original_array = np.array(original_img.resize((224, 224), Image.Resampling.BILINEAR), dtype=np.float32)
            
            # Upsample heatmap to match original size (224x224)
            heatmap_resized = tf.image.resize(heatmap[..., np.newaxis], (224, 224)).numpy().squeeze()
            heatmap_uint8 = np.uint8(255 * heatmap_resized)
            
            # Matplotlib jet colormap mapping
            cmap = plt.get_cmap("jet")
            heatmap_color = cmap(heatmap_uint8 / 255.0)[:, :, :3]  # RGB, ignore alpha

            # Original float [0, 1]
            original_float = original_array / 255.0
            
            # Overlay formula: 0.6 * original + 0.4 * heatmap
            overlay = 0.6 * original_float + 0.4 * heatmap_color
            overlay = np.clip(overlay, 0.0, 1.0)
            overlay_uint8 = np.uint8(255 * overlay)
            heatmap_color_uint8 = np.uint8(255 * heatmap_color)

            # 6) Convert images to Base64 encoded strings
            def to_b64(arr: np.ndarray) -> str:
                pil_img = Image.fromarray(arr)
                buffered = io.BytesIO()
                pil_img.save(buffered, format="JPEG")
                img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                return f"data:image/jpeg;base64,{img_str}"

            original_b64 = to_b64(np.uint8(original_array))
            heatmap_b64 = to_b64(heatmap_color_uint8)
            overlay_b64 = to_b64(overlay_uint8)

            return {
                "available": True,
                "original": original_b64,
                "heatmap": heatmap_b64,
                "overlay": overlay_b64
            }

        except Exception as e:
            # Failure must not crash prediction
            print(f"[ERROR] Grad-CAM computation failed: {str(e)}")
            return {
                "available": False,
                "original": "",
                "heatmap": "",
                "overlay": "",
                "warning": f"Explainability visualization unavailable for this image. Error: {str(e)}"
            }
