# PHYTOVISIONAI — IMPLEMENTATION STATUS

**Version:** 1.1.0  
**Updated:** September 02, 2026  

---

## Detailed Implementation Status Matrix

| Feature | Status | Actual Implementation | File(s) | Tested |
| :--- | :---: | :--- | :--- | :---: |
| **40-Class Leaf Identification** | **IMPLEMENTED** | MobileNetV2 Keras model trained on 6,788 images across 40 classes | `ai_service/app/services/inference_service.py`, `training/models/mobilenetv2/mobilenetv2_best.keras` | **TESTED (89.70% Top-1 Acc)** |
| **Temperature Calibration ($T=0.8037$)** | **IMPLEMENTED** | Logit temperature scaling ($T=0.8037$) fitted on validation logits | `ai_service/app/services/inference_service.py` (Line 9 & 120) | **TESTED (ECE 0.0110)** |
| **Rejection Threshold ($0.6234$)** | **IMPLEMENTED** | Low-confidence prediction rejection below threshold 0.6234 | `ai_service/app/services/inference_service.py` (Line 10 & 136) | **TESTED** |
| **Grad-CAM Explainability** | **IMPLEMENTED** | Deep feature map extraction from MobileNetV2 layer `Conv_1` | `ai_service/app/services/gradcam_service.py` | **TESTED** |
| **GBIF Taxonomy Matching** | **IMPLEMENTED** | Dynamic species match & taxonomy lookup via GBIF REST API | `backend/services/scientific/gbifService.js` | **TESTED** |
| **PubChem Compound Verification** | **IMPLEMENTED** | Candidate lookup & chemical property query via PubChem PUG REST API | `backend/services/scientific/pubchemService.js` | **TESTED** |
| **Europe PMC Literature Search** | **IMPLEMENTED** | Dynamic medicinal evidence search via Europe PMC REST API | `backend/services/scientific/europePmcService.js` | **TESTED** |
| **Crossref Paper Search** | **IMPLEMENTED** | Dynamic DOI & publication search via Crossref REST API | `backend/services/scientific/crossrefService.js` | **TESTED** |
| **Dynamic Literature Extraction Pipeline** | **IMPLEMENTED** | 2-Tier dynamic extraction search from Europe PMC literature + static monograph fallback | `backend/services/scientific/extractionService.js` | **TESTED** |
| **Extraction Protocol UI** | **IMPLEMENTED** | React UI displaying 10 extraction parameters with dynamic vs static fallback badges & DOI links | `frontend/src/App.jsx`, `frontend/src/App.css` | **TESTED** |
| **Pharmacological Safety & Dosage** | **IMPLEMENTED** | Evidence-backed safety monographs & dosage guidelines | `backend/services/scientific/safetyService.js` | **TESTED** |
| **Express API Gateway** | **IMPLEMENTED** | Gateway handling file uploads, AI forwarding, and scientific aggregation | `backend/server.js`, `backend/controllers/predictController.js` | **TESTED** |
| **Security Headers & CORS** | **IMPLEMENTED** | Security headers (`nosniff`, `DENY`, `XSS`) & CORS origin policy in Express and FastAPI | `backend/server.js`, `ai_service/app/main.py` | **TESTED** |
| **MongoDB Caching Layer** | **NOT IMPLEMENTED** | System operates without a database layer (All API queries live) | N/A | **N/A** |
| **User Authentication / JWT** | **NOT IMPLEMENTED** | System is designed as a public research API gateway without user auth | N/A | **N/A** |
| **Cloudinary Cloud Storage** | **NOT IMPLEMENTED** | Images are processed in-memory (`Multer` buffer & PIL `BytesIO`) | N/A | **N/A** |

---

## Status Legend
- **IMPLEMENTED:** Fully implemented, verified, and operational in current source code.
- **PARTIALLY IMPLEMENTED:** Functional with minor limitations or fallback behavior.
- **NOT IMPLEMENTED:** Not present in current source code.
- **FAILED:** Implemented but failed functional testing.
- **NOT TESTED:** Implemented but not yet verified.
