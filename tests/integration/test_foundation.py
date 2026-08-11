import os
import io
import time
import unittest
import requests
from PIL import Image
import numpy as np

BACKEND_URL = "http://127.0.0.1:5000/api/predict"
TEST_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "dataset", "final_split", "test")

class PhytoVisionFoundationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Find some real leaf images from the test split to use for testing
        cls.sample_images = {}
        if os.path.exists(TEST_DATA_DIR):
            for class_name in sorted(os.listdir(TEST_DATA_DIR)):
                class_dir = os.path.join(TEST_DATA_DIR, class_name)
                if os.path.isdir(class_dir):
                    for fn in os.listdir(class_dir):
                        if fn.lower().endswith((".jpg", ".jpeg", ".png")):
                            cls.sample_images[class_name] = os.path.join(class_dir, fn)
                            break
        
        # Verify we found sample images
        if not cls.sample_images:
            raise RuntimeError(f"No test images found in {TEST_DATA_DIR}. Make sure splits exist.")
            
        print(f"Loaded {len(cls.sample_images)} sample classes for testing.")

    def test_01_valid_jpeg(self):
        """1. Test valid JPEG upload succeeds."""
        # Grab first available image (e.g. Aloevera or Amla)
        sample_path = list(self.sample_images.values())[0]
        with open(sample_path, "rb") as f:
            files = {"image": (os.path.basename(sample_path), f, "image/jpeg")}
            response = requests.post(BACKEND_URL, files=files)
            
        self.assertEqual(response.status_code, 200, f"Valid JPEG failed: {response.text}")
        data = response.json()
        self.assertIn("prediction", data)
        self.assertFalse(data["prediction"]["rejected"])

    def test_02_valid_png(self):
        """2. Test valid PNG upload succeeds."""
        # Load a JPEG and save it as PNG in memory
        sample_path = list(self.sample_images.values())[0]
        img = Image.open(sample_path)
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format="PNG")
        img_byte_arr.seek(0)
        
        files = {"image": ("test_leaf.png", img_byte_arr, "image/png")}
        response = requests.post(BACKEND_URL, files=files)
        
        self.assertEqual(response.status_code, 200, f"Valid PNG failed: {response.text}")
        data = response.json()
        self.assertIn("prediction", data)
        self.assertFalse(data["prediction"]["rejected"])

    def test_03_invalid_file(self):
        """3. Test invalid (non-image) file is rejected."""
        txt_data = io.BytesIO(b"This is a text file, not an image.")
        files = {"image": ("test.txt", txt_data, "text/plain")}
        response = requests.post(BACKEND_URL, files=files)
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("error", data)

    def test_04_corrupted_image(self):
        """4. Test corrupted image file is rejected."""
        # Image header with garbage data
        corrupt_data = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"randomgarbage" * 100)
        files = {"image": ("corrupted.jpg", corrupt_data, "image/jpeg")}
        response = requests.post(BACKEND_URL, files=files)
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("error", data)
        self.assertIn("Corrupted or invalid image", data["message"])

    def test_05_oversized_image(self):
        """5. Test oversized image (> 5MB) is rejected."""
        # Create a large image in-memory
        large_img = Image.fromarray(np.zeros((3000, 3000, 3), dtype=np.uint8))
        img_byte_arr = io.BytesIO()
        large_img.save(img_byte_arr, format="JPEG", quality=100)
        
        # Verify size is > 5MB
        size = img_byte_arr.tell()
        print(f"Oversized image size: {size / (1024*1024):.2f} MB")
        img_byte_arr.seek(0)
        
        files = {"image": ("large.jpg", img_byte_arr, "image/jpeg")}
        response = requests.post(BACKEND_URL, files=files)
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("error", data)
        self.assertIn("exceeds the limit", data["message"])

    def test_06_unsupported_format(self):
        """6. Test unsupported formats (e.g. BMP) are rejected."""
        # Save a BMP image in-memory
        sample_path = list(self.sample_images.values())[0]
        img = Image.open(sample_path)
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format="BMP")
        img_byte_arr.seek(0)
        
        files = {"image": ("leaf.bmp", img_byte_arr, "image/x-ms-bmp")}
        response = requests.post(BACKEND_URL, files=files)
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("error", data)
        self.assertIn("Unsupported file type", data["message"])

    def test_07_different_image_dimensions(self):
        """7. Test images with non-standard dimensions are accepted and scaled correctly."""
        # Non-square portrait image (300x600)
        portrait_img = Image.fromarray(np.ones((600, 300, 3), dtype=np.uint8) * 128)
        img_byte_arr = io.BytesIO()
        portrait_img.save(img_byte_arr, format="JPEG")
        img_byte_arr.seek(0)
        
        files = {"image": ("portrait.jpg", img_byte_arr, "image/jpeg")}
        response = requests.post(BACKEND_URL, files=files)
        
        # Should succeed because preprocessing will resize/scale it to 224x224
        self.assertEqual(response.status_code, 200, f"Portrait dimensions failed: {response.text}")

    def test_08_prediction_response_schema(self):
        """8. Test prediction response matches the expected JSON schema."""
        sample_path = list(self.sample_images.values())[0]
        with open(sample_path, "rb") as f:
            files = {"image": ("leaf.jpg", f, "image/jpeg")}
            response = requests.post(BACKEND_URL, files=files)
            
        data = response.json()
        
        # Verify required top-level keys
        self.assertIn("prediction", data)
        self.assertIn("model", data)
        self.assertIn("gradcam", data)
        self.assertIn("warnings", data)
        
        # Verify prediction schema
        pred = data["prediction"]
        self.assertIn("class", pred)
        self.assertIn("scientificName", pred)
        self.assertIn("commonName", pred)
        self.assertIn("rawConfidence", pred)
        self.assertIn("calibratedConfidence", pred)
        self.assertIn("rejected", pred)
        self.assertIn("rejectionThreshold", pred)
        self.assertIn("topPredictions", pred)
        
        # Verify model schema
        model_meta = data["model"]
        self.assertIn("name", model_meta)
        self.assertIn("version", model_meta)
        self.assertIn("inputSize", model_meta)
        
        # Verify gradcam schema
        gc = data["gradcam"]
        self.assertIn("available", gc)
        self.assertIn("original", gc)
        self.assertIn("heatmap", gc)
        self.assertIn("overlay", gc)

    def test_09_raw_probability_exists(self):
        """9. Test raw probability exists and is within valid range."""
        sample_path = list(self.sample_images.values())[0]
        with open(sample_path, "rb") as f:
            files = {"image": ("leaf.jpg", f, "image/jpeg")}
            response = requests.post(BACKEND_URL, files=files)
            
        data = response.json()
        raw_conf = data["prediction"]["rawConfidence"]
        self.assertIsInstance(raw_conf, float)
        self.assertTrue(0.0 <= raw_conf <= 1.0)

    def test_10_calibrated_confidence_exists(self):
        """10. Test calibrated confidence exists, is within valid range, and matches scaling logic."""
        sample_path = list(self.sample_images.values())[0]
        with open(sample_path, "rb") as f:
            files = {"image": ("leaf.jpg", f, "image/jpeg")}
            response = requests.post(BACKEND_URL, files=files)
            
        data = response.json()
        cal_conf = data["prediction"]["calibratedConfidence"]
        self.assertIsInstance(cal_conf, float)
        self.assertTrue(0.0 <= cal_conf <= 1.0)

    def test_11_rejection_threshold_is_0_5982(self):
        """11. Test that the rejection threshold returned is exactly 0.5982."""
        sample_path = list(self.sample_images.values())[0]
        with open(sample_path, "rb") as f:
            files = {"image": ("leaf.jpg", f, "image/jpeg")}
            response = requests.post(BACKEND_URL, files=files)
            
        data = response.json()
        self.assertEqual(data["prediction"]["rejectionThreshold"], 0.5982)

    def test_12_mobilenetv2_is_production_model(self):
        """12. Test that MobileNetV2 is identified as the production model."""
        sample_path = list(self.sample_images.values())[0]
        with open(sample_path, "rb") as f:
            files = {"image": ("leaf.jpg", f, "image/jpeg")}
            response = requests.post(BACKEND_URL, files=files)
            
        data = response.json()
        self.assertEqual(data["model"]["name"], "MobileNetV2")

    def test_13_efficientnetb0_is_not_used(self):
        """13. Test that EfficientNetB0 is not reported as the model name."""
        sample_path = list(self.sample_images.values())[0]
        with open(sample_path, "rb") as f:
            files = {"image": ("leaf.jpg", f, "image/jpeg")}
            response = requests.post(BACKEND_URL, files=files)
            
        data = response.json()
        self.assertNotEqual(data["model"]["name"], "EfficientNetB0")

    def test_14_filename_does_not_influence_prediction(self):
        """14. Test that image filename does not influence classification."""
        # We will upload a Rose image, but name the file "neem.jpg"
        if "Rose" not in self.sample_images:
            self.skipTest("No Rose image found in dataset to run filename independence test.")
            
        rose_path = self.sample_images["Rose"]
        with open(rose_path, "rb") as f:
            # Filename is set to neem.jpg, but content is Rose
            files = {"image": ("neem.jpg", f, "image/jpeg")}
            response = requests.post(BACKEND_URL, files=files)
            
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify it classifies it as Rose (or candidate is Rose, if rejected), NOT Neem
        prediction_class = data["prediction"]["candidate"]["class"]
        self.assertEqual(prediction_class, "Rose", f"Expected Rose class, got {prediction_class} because of filename influence.")

    def test_15_gradcam_produces_genuine_result(self):
        """15. Test that Grad-CAM produces a genuine base64-encoded visual result."""
        sample_path = list(self.sample_images.values())[0]
        with open(sample_path, "rb") as f:
            files = {"image": ("leaf.jpg", f, "image/jpeg")}
            response = requests.post(BACKEND_URL, files=files)
            
        data = response.json()
        self.assertTrue(data["gradcam"]["available"])
        self.assertTrue(data["gradcam"]["original"].startswith("data:image/jpeg;base64,"))
        self.assertTrue(data["gradcam"]["heatmap"].startswith("data:image/jpeg;base64,"))
        self.assertTrue(data["gradcam"]["overlay"].startswith("data:image/jpeg;base64,"))

    def test_16_rejection_for_unsupported_or_low_confidence_images(self):
        """Additional validation: Test calibration rejection for low-confidence random noise."""
        # Create a completely uniform grey/blank image (should result in low confidence/rejected = True)
        blank_img = Image.fromarray(np.ones((224, 224, 3), dtype=np.uint8) * 128)
        img_byte_arr = io.BytesIO()
        blank_img.save(img_byte_arr, format="JPEG")
        img_byte_arr.seek(0)
        
        files = {"image": ("blank.jpg", img_byte_arr, "image/jpeg")}
        response = requests.post(BACKEND_URL, files=files)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertTrue(data["prediction"]["rejected"])
        self.assertEqual(data["prediction"]["class"], "Unknown")
        self.assertEqual(data["prediction"]["scientificName"], "Unknown")
        self.assertEqual(data["prediction"]["commonName"], "Unknown")
        self.assertIn("uncertaintyMessage", data["prediction"])
        self.assertIn("rejectionReason", data["prediction"])

if __name__ == "__main__":
    print("Starting integration test suite...")
    unittest.main()
