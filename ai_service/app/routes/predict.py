import io
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from PIL import Image

from app.services.inference_service import InferenceService
from app.services.gradcam_service import GradcamService

# Limit file size to 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

router = APIRouter()
inference_service = InferenceService()

def init_inference(root_dir: str):
    inference_service.load_model_and_mapping(root_dir)

@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    # 1) Validate MIME Type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported media type: {file.content_type}. Only JPG, JPEG, PNG, and WebP are allowed."
        )

    # 2) Read and Validate File Size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File is too large ({len(file_bytes)} bytes). Maximum allowed size is 5MB."
        )

    # 3) Validate Decodability & Image Integrity
    try:
        pil_image = Image.open(io.BytesIO(file_bytes))
        pil_image.verify()  # Verifies integrity without fully decoding
        # Re-open because verify() closes the file pointer or limits subsequent actions
        pil_image = Image.open(io.BytesIO(file_bytes))
        # Trigger actual load/decoding to test decodability
        pil_image.load()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupted or invalid image data. Error decoding: {str(e)}"
        )

    # 4) Validate Dimensions
    width, height = pil_image.size
    if width <= 0 or height <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image dimensions: {width}x{height}."
        )

    # 5) Run Inference
    try:
        prediction_result, preprocessed_img, predicted_idx = inference_service.predict(pil_image)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(e)}"
        )

    # 6) Run Grad-CAM (should NOT crash prediction if it fails)
    gradcam_result = GradcamService.generate_gradcam(
        inference_service.model,
        preprocessed_img,
        pil_image,
        predicted_idx
    )

    # 7) Build Combined Response
    response = {
        "prediction": prediction_result["prediction"],
        "model": prediction_result["model"],
        "gradcam": gradcam_result,
        "taxonomy": {},
        "botanical": {},
        "compounds": [],
        "medicinalEvidence": [],
        "extractionEvidence": [],
        "researchPapers": [],
        "sources": [],
        "warnings": []
    }

    # Add warning if Grad-CAM failed
    if not gradcam_result.get("available", False):
        warn_msg = gradcam_result.get("warning", "Explainability visualization unavailable for this image.")
        response["warnings"].append(warn_msg)

    return response
