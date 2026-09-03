# PHYTOVISIONAI — PROJECT DATA FLOW

**Version:** 1.1.0  
**Updated:** September 02, 2026  

---

## Complete End-to-End Data Flow

```
[User Selects Image]
       │
       ▼
[frontend/src/App.jsx] -> handleFileChange() stores file in React state
       │
       ▼
[frontend/src/App.jsx] -> handlePredict() sends HTTP POST request
       │  (Endpoint: http://127.0.0.1:5000/api/predict, Body: FormData 'image')
       ▼
[backend/routes/predict.js] -> Multer memoryStorage intercepts file
       │
       ▼
[backend/controllers/predictController.js] -> predictImage()
       │  Validates MIME type & size (<5MB), constructs FormData, forwards request via Axios
       ▼
[ai_service/app/routes/predict.py] -> predict()
       │  Endpoint: POST http://127.0.0.1:8000/predict
       │  Validates image integrity & dimensions via PIL
       ▼
[ai_service/app/services/inference_service.py] -> InferenceService.predict()
       │  1. Preprocessing: Resizes PIL image to 224x224 RGB, applies mobilenet_preprocess() (scales [-1, 1])
       │  2. MobileNetV2 inference: Raw softmax probabilities output from model.predict()
       │  3. Logit extraction: logits = np.log(np.clip(raw_probs, 1e-12, 1.0))
       │  4. Calibration: calibrated_logits = logits / 0.8037
       │  5. Calibrated Softmax: calibrated_probs = softmax(calibrated_logits)
       │  6. Rejection check: Is max(calibrated_probs) < 0.6234?
       │     If YES -> Set class="Unknown", scientificName="Unknown", rejected=true
       ▼
[ai_service/app/services/gradcam_service.py] -> GradcamService.generate_gradcam()
       │  Generates Grad-CAM Base64 images (original, heatmap, overlay) using target layer Conv_1
       ▼
[ai_service/app/routes/predict.py] returns JSON prediction object to Express backend
       │
       ▼
[backend/controllers/predictController.js]
       │  If prediction is accepted (!rejected):
       │     Calls backend/services/scientific/researchService.js -> getResearchData()
       │     Concurrent Promise.all calls to:
       │       - gbifService.js (Taxonomy lookup)
       │       - pubchemService.js (Bioactive compound verification)
       │       - europePmcService.js (Medicinal literature search)
       │       - crossrefService.js (Research paper search)
       │       - extractionService.js (2-Tier Dynamic Literature Extraction + Monograph Fallback)
       │     Synchronous local lookup call to:
       │       - safetyService.js (Pharmacological safety & dosage)
       ▼
[backend/controllers/predictController.js] merges AI prediction + scientific evidence into final JSON
       │
       ▼
[frontend/src/App.jsx] receives HTTP 200 response -> updates 'result' state
       │
       ▼
[frontend/src/App.jsx] renders prediction card, confidence bar, Grad-CAM visualization, and 6 research tabs
```

---

## Detailed Component Responsibilities & Data Maps

### 1. Frontend UI (`frontend/src/App.jsx`)
- **Input:** User image file selection via file input `<input type="file" accept="image/*">`.
- **Action:** Sends `FormData` payload containing `image` to `POST http://127.0.0.1:5000/api/predict`.
- **Output:** Renders plant identification, calibrated confidence score, top-5 confidence distribution, Grad-CAM heatmaps, and tabbed scientific profiles.

### 2. Express Backend API Gateway (`backend/controllers/predictController.js`)
- **Input:** Multipart image upload on `/api/predict`.
- **Action:** Validates MIME type and file size ($< 5\text{ MB}$), streams file buffer to FastAPI AI Service at `http://127.0.0.1:8000/predict`.
- **Aggregation:** If accepted, invokes `researchService.getResearchData()` which executes concurrent API queries to GBIF, PubChem, Europe PMC, Crossref, and Extraction Service.

### 3. FastAPI AI Inference Service (`ai_service/app/services/inference_service.py`)
- **Input:** PIL image object.
- **Action:**
  1. Resizes image to $224 \times 224 \times 3$ RGB.
  2. Applies `mobilenet_v2.preprocess_input()` (normalizes pixel values to $[-1.0, 1.0]$).
  3. Evaluates `MobileNetV2` model producing raw softmax vector.
  4. Applies temperature scaling ($T = 0.8037$) to raw logits:
     $$\text{calibrated\_logits} = \frac{\text{logits}}{0.8037}$$
  5. Computes calibrated softmax confidence:
     $$p_{\text{calibrated}} = \text{Softmax}(\text{calibrated\_logits})$$
  6. Evaluates rejection threshold:
     $$\text{If } \max(p_{\text{calibrated}}) < 0.6234 \implies \text{Reject as "Unknown"}$$
- **Output:** JSON object containing `prediction`, `model`, and top 5 predictions array.

### 4. Grad-CAM Explainability (`ai_service/app/services/gradcam_service.py`)
- **Target Layer:** Convolutional feature map layer `Conv_1` of `mobilenetv2_1.00_224` (dimensions $7 \times 7 \times 1280$).
- **Gradient Calculation:** Uses `tf.GradientTape()` to calculate gradients of the predicted class score $y^c$ with respect to layer `Conv_1` feature map activations $A^k$:
  $$\alpha_k^c = \frac{1}{Z} \sum_i \sum_j \frac{\partial y^c}{\partial A_{i,j}^k}$$
- **Heatmap:** Computes weighted sum $L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)$, resizes to $224 \times 224$, applies Matplotlib `jet` colormap, blends overlay ($0.6 \times \text{Original} + 0.4 \times \text{Heatmap}$), and converts images to Base64 data URLs.

### 5. Scientific Data Pipeline (`backend/services/scientific/`)
- **GBIF Taxonomy (`gbifService.js`):** Queries `api.gbif.org/v1/species/match` and `/v1/species/{key}` to retrieve Kingdom, Phylum, Class, Order, Family, Genus, Species, and Rank.
- **PubChem Bioactive Compounds (`pubchemService.js`):** Resolves candidate phytochemicals for plant class against PubChem PUG REST API, returning CIDs, IUPAC names, and SMILES strings.
- **Europe PMC Literature (`europePmcService.js`):** Queries `ebi.ac.uk/europepmc/webservices/rest/search` for medicinal plant research articles.
- **Crossref Research Papers (`crossrefService.js`):** Queries `api.crossref.org/works` for DOI publications.
- **Scientific Extraction Guidance (`extractionService.js`):**
  - **Tier 1 (Dynamic):** Queries Europe PMC REST API for extraction papers, parsing title & abstract for Method, Solvent, Concentration, Temperature, Duration, Sample Preparation, Plant Part, Title, Reference, and DOI. Parameters not reported in the source are explicitly set to `"Not reported in retrieved source"`.
  - **Tier 2 (Curated Fallback):** If dynamic search yields no parameter matches, falls back to the curated monograph dictionary, clearly tagged with `isStaticFallback: true` and `retrievedMode: "static_curated"`.
- **Pharmacological Safety & Dosage (`safetyService.js`):** Returns evidence-backed safety monographs, toxicity levels, recommended dosages, and precautions.
