# PHYTOVISIONAI — FINAL PROJECT ARCHITECTURE

**Version:** 1.1.0  
**Updated:** September 02, 2026  

---

## High-Level System Architecture

The PhytoVisionAI system is designed as a decoupled, multi-tier microservice architecture comprising a React Single-Page Application, an Express API Gateway, a FastAPI AI Inference Engine, and multiple external scientific REST web services.

```
+-----------------------------------------------------------------------------------+
|                                  USER BROWSER                                     |
|                       React 18 + Vite Frontend (App.jsx)                          |
+-----------------------------------------+-----------------------------------------+
                                          |
                                 HTTP POST /api/predict
                                 (Multipart Image Upload)
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                               EXPRESS API GATEWAY                                 |
|                         (Node.js / Express on Port 5000)                          |
|  - Security Headers (nosniff, DENY, XSS-Protection)                               |
|  - In-Memory Upload Handler (Multer MemoryStorage)                                |
|  - Scientific API Aggregator & Fallback Manager                                   |
+-----------------------------------------+-----------------------------------------+
                                          |
                                 HTTP POST /predict
                                 (Stream Binary Buffer)
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                              FASTAPI AI SERVICE                                   |
|                        (Python / FastAPI on Port 8000)                            |
|  - Preprocessing (Resizes 224x224 RGB, mobilenet_v2.preprocess_input)            |
|  - MobileNetV2 Neural Network Inference (40-Class Softmax Output)                 |
|  - Confidence Calibration (Temperature Scaling T=0.8037)                           |
|  - Out-of-Distribution Rejection Engine (Threshold=0.6234)                        |
|  - Grad-CAM Explainable AI Visualizer (Backbone Layer Conv_1)                      |
+-----------------------------------------+-----------------------------------------+
                                          |
                           Returns Prediction + Grad-CAM JSON
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        SCIENTIFIC RESEARCH AGGREGATOR                             |
|               (backend/services/scientific/researchService.js)                    |
|                                                                                   |
|  +---------------------------+  +---------------------------+  +----------------+ |
|  |     GBIF REST API         |  |   PubChem PUG REST API    |  | Europe PMC API | |
|  | (Botanical Taxonomy Match)|  |  (Chemical SMILES & CID)  |  |  (Literature)  | |
|  +---------------------------+  +---------------------------+  +----------------+ |
|                                                                                   |
|  +---------------------------+  +---------------------------+  +----------------+ |
|  |     Crossref REST API     |  | 2-Tier Extraction Service |  | Safety Service | |
|  |  (Publication Metadata)   |  | (Dynamic PMC + Monograph) |  |  (Monographs)  | |
|  +---------------------------+  +---------------------------+  +----------------+ |
+-----------------------------------------+-----------------------------------------+
                                          |
                        Returns Complete Unified Payload JSON
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                  USER BROWSER                                     |
|                   Interactive Dashboard & 6 Research Tabs                         |
+-----------------------------------------------------------------------------------+
```

---

## Core Subsystem Specifications

### 1. AI Inference Subsystem
- **Runtime:** Python 3.10+ / FastAPI / Uvicorn.
- **Model File:** `training/models/mobilenetv2/mobilenetv2_best.keras` ($25.91\text{ MB}$).
- **Target Architecture:** MobileNetV2 pre-trained on ImageNet with custom classification head ($256$ dense + ReLU, $0.2$ dropout, $40$ softmax).
- **Calibration Engine:** Temperature scaling logits ($T=0.8037$) and rejection thresholding ($0.6234$).
- **Explainability Engine:** Grad-CAM utilizing gradients of target class output score with respect to backbone layer `Conv_1` feature map activations.

### 2. Express API Gateway Subsystem
- **Runtime:** Node.js / Express on Port 5000.
- **Upload Storage:** In-Memory buffer handling using `multer.memoryStorage()`. No image files are saved to local disk during inference.
- **Security:** HTTP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`), strict CORS policy, size validation ($5\text{ MB}$ limit), and MIME type verification.

### 3. Scientific Data Subsystem
- **GBIF Service:** Queries `https://api.gbif.org/v1/species/match` for botanical taxonomy hierarchy.
- **PubChem Service:** Queries `https://pubchem.ncbi.nlm.nih.gov/rest/pug` for chemical structures (CIDs, IUPAC names, SMILES).
- **Europe PMC Service:** Queries `https://www.ebi.ac.uk/europepmc/webservices/rest/search` for medicinal plant literature studies and abstracts.
- **Crossref Service:** Queries `https://api.crossref.org/works` for DOI and publisher metadata.
- **Extraction Guidance Service:** 2-Tier pipeline querying Europe PMC dynamically for extraction parameter matches (Method, Solvent, Concentration, Temperature, Duration, Preparation, Plant Part, DOI), falling back to static monograph data if unlisted in literature.
- **Safety Service:** Pharmacological safety guidelines, dosage recommendations, toxicity levels, and contraindications.
