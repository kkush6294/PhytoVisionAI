# PHYTOVISIONAI — PAPER VS CODE FINAL AUDIT

**Date:** September 02, 2026  
**Purpose:** Ensure 100% truthfulness and consistency between the IEEE research paper draft and the actual software implementation.

---

## Detailed Paper Claims vs Code Reality Audit

| Paper Claim / Topic | Actual Code Implementation | Status | Required Paper Change / Alignment |
| :--- | :--- | :---: | :--- |
| **Primary Classifier Model** | `MobileNetV2` trained on custom dataset (`mobilenetv2_best.keras`, $25.91\text{ MB}$) | **SUPPORTED** | State that MobileNetV2 is the deployed final model; EfficientNetB0 was evaluated as a baseline. |
| **Dataset Size & Classes** | 40 valid medicinal plant classes, 6,788 total images (4,740 Train / 990 Val / 1,058 Test) | **SUPPORTED** | Cite exact dataset statistics: 40 classes, 6,788 total images, 0 cross-split duplicates. |
| **Model Classification Accuracy** | Test Top-1 Acc: `89.70%` \| Top-3 Acc: `97.83%` \| Top-5 Acc: `98.96%` \| Macro F1: `89.59%` | **SUPPORTED** | Report exact empirical test set metrics. |
| **Confidence Calibration** | Temperature Scaling ($T=0.8037$) fitted on validation logits; ECE = `0.0110` | **SUPPORTED** | Cite Temperature Scaling $T=0.8037$ and test ECE $=0.0110$. |
| **OOD Rejection Threshold** | Rejection threshold $\tau = 0.6234$ applied to calibrated max-softmax probability | **SUPPORTED** | Cite rejection threshold $\tau = 0.6234$ fitted on validation confidence distribution. |
| **Grad-CAM Explainability** | Implemented using target layer `Conv_1` of MobileNetV2 backbone ($7 \times 7 \times 1280$) | **SUPPORTED** | Describe Grad-CAM visual activation mapping targeted at MobileNetV2 `Conv_1` layer. |
| **GBIF Taxonomy Retrieval** | Dynamic REST API integration (`api.gbif.org/v1/species/match`) | **SUPPORTED** | Describe dynamic GBIF API taxonomy matching. |
| **PubChem Compound Verification** | Dynamic PUG REST API query (`pubchem.ncbi.nlm.nih.gov/rest/pug`) for CIDs & SMILES | **SUPPORTED** | Describe dynamic PubChem PUG REST chemical structure lookup. |
| **Europe PMC & Crossref Papers** | Dynamic REST API integrations for literature studies and DOIs | **SUPPORTED** | Cite live literature retrieval from Europe PMC and Crossref APIs. |
| **Extraction Protocol Retrieval** | 2-Tier pipeline: Dynamic Europe PMC extraction search + static monograph fallback | **SUPPORTED** | **UPDATE PAPER:** Describe 2-tier pipeline (dynamic literature extraction + curated monograph fallback). Do not claim 100% dynamic without mentioning fallback. |
| **Pharmacological Safety & Dosage** | Evidence-backed monograph database (`safetyService.js` and `Plant` schema) | **SUPPORTED** | State that safety monographs are curated from WHO/IP monographs and stored in the system database. |
| **Database Knowledge & User Persistence (MongoDB)** | MongoDB with 40 plant records, user accounts, identification history, and saved plants | **SUPPORTED** | Cite MongoDB as the persistence layer for plant metadata, user search history, and saved plant collections. |
| **User Authentication / JWT** | JWT session authentication with bcrypt password hashing, guest sessions, and write restrictions | **SUPPORTED** | Describe JWT-based role authentication with guest access and registered researcher accounts. |
| **In-Memory Image Processing & Privacy** | Images handled in-memory (`Multer` buffer & PIL `BytesIO`); zero local disk retention | **SUPPORTED** | State that specimen images are processed entirely in-memory for privacy preservation without third-party cloud storage (e.g., Cloudinary). |

---

## Critical Paper Writing Rules
1. **Accurately describe Database and Authentication:** MongoDB is actively deployed for the 40 medicinal plant records, researcher accounts, history tracking, and saved plant libraries.
2. **Accurately describe JWT Security:** The platform implements JWT-secured sessions with guest access and restricted write operations.
3. **Accurately describe In-Memory Privacy:** Leaf images are processed entirely in-memory using memory buffers, eliminating external cloud storage dependencies.
4. **Accurately describe Extraction Guidance:** State that extraction parameters are dynamically parsed from Europe PMC literature where reported, with curated monograph fallbacks for unlisted species.
5. **Cite exact metrics:** Use $89.70\%$ Top-1 Accuracy, $97.83\%$ Top-3 Accuracy, $98.96\%$ Top-5 Accuracy, $T=0.8037$, and $\tau=0.6234$.

