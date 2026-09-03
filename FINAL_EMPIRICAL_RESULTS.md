# PHYTOVISIONAI — FINAL EMPIRICAL RESULTS & BENCHMARK SUMMARY

**Date:** September 03, 2026  
**Evaluation Scope:** Standalone test set ($N_{\text{test}} = 1,058$ leaf specimen images across 40 medicinal plant classes)  
**Target Architecture:** MobileNetV2 with custom dense classification head (deployed model) and temperature scaling calibration  

---

## 1. Summary Benchmark Table (IEEE Research Paper Format)

| Experimental Metric / Parameter | Value / Empirical Result | Source Verification |
| :--- | :---: | :--- |
| **Medicinal Plant Classes** | **40** | `training/models/mobilenetv2/class_mapping.json` |
| **Total Curated Dataset Size** | **6,788 images** | `reports/models/test_manifest.csv` |
| **Training Split ($70\%$)** | **4,740 images** | `reports/models/train_manifest.csv` |
| **Validation Split ($15\%$)** | **990 images** | `reports/models/val_manifest.csv` |
| **Testing Split ($15\%$)** | **1,058 images** | `reports/models/test_manifest.csv` |
| **Cross-Split Duplicates** | **0** (perceptual hash checked) | Dataset build audit report |
| **Model Disk Footprint** | **25.91 MB** | `mobilenetv2_best.keras` |
| **Total Parameters** | **2,596,200** | Keras Model Architecture Summary |
| **Trainable Parameters** | **2,019,560** | Fine-Tuning Stage 2 |
| **Top-1 Test Accuracy** | **89.70%** ($0.8970$) | `reports/models/eval_results.json` |
| **Top-3 Test Accuracy** | **97.83%** ($0.9783$) | `reports/models/eval_results.json` |
| **Top-5 Test Accuracy** | **98.96%** ($0.9896$) | `reports/models/eval_results.json` |
| **Macro Precision** | **90.19%** ($0.9019$) | Scikit-Learn Classification Report |
| **Macro Recall** | **90.31%** ($0.9031$) | Scikit-Learn Classification Report |
| **Macro F1-Score** | **89.59%** ($0.8959$) | Scikit-Learn Classification Report |
| **Weighted F1-Score** | **89.58%** ($0.8958$) | Scikit-Learn Classification Report |
| **Temperature Scaling Factor ($T$)** | **0.8037** | `calibration_results.json` |
| **Pre-Calibration ECE** | **0.0241** ($2.41\%$) | Reliability diagram validation |
| **Post-Calibration ECE** | **0.0110** ($1.10\%$) | Validation set logit optimization |
| **OOD Rejection Threshold ($\tau$)** | **0.6234** | $95\%$ sensitivity operating point |
| **Average CPU Inference Latency** | **48.2 ms** | Benchmark on Intel Core i7 / 16GB |
| **Grad-CAM Target Backbone Layer** | **`Conv_1`** ($7 \times 7 \times 1280$) | Feature activation visualizer |

---

## 2. LaTeX Code for IEEE Paper Inclusion

```latex
\begin{table}[htbp]
\caption{Empirical Performance and Calibration Metrics of the Deployed PhytoVisionAI Model}
\label{tab:empirical_metrics}
\centering
\begin{tabular}{|l|c|}
\hline
\textbf{Metric / Parameter} & \textbf{Empirical Value} \\
\hline
Medicinal Plant Classes & 40 \\
Dataset Size (Train / Val / Test) & 6,788 (4,740 / 990 / 1,058) \\
Cross-Split Duplicates & 0 \\
Model Disk Footprint & 25.91 MB \\
Total Parameters & 2,596,200 \\
\hline
Top-1 Test Accuracy & 89.70\% \\
Top-3 Test Accuracy & 97.83\% \\
Top-5 Test Accuracy & 98.96\% \\
Macro Precision & 90.19\% \\
Macro Recall & 90.31\% \\
Macro F1-Score & 89.59\% \\
Weighted F1-Score & 89.58\% \\
\hline
Temperature Scaling ($T$) & 0.8037 \\
Expected Calibration Error (ECE) & 0.0110 \\
OOD Rejection Threshold ($\tau$) & 0.6234 \\
Average Inference Latency & 48.2 ms \\
Grad-CAM Feature Layer & Conv\_1 ($7 \times 7 \times 1280$) \\
\hline
\end{tabular}
\end{table}
```

---

## 3. Comparative Model Baseline Summary

| Model Architecture | Input Size | Parameters | Disk Size | Top-1 Acc | Top-3 Acc | Top-5 Acc | Macro F1 | Deployment Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **MobileNetV2 (Selected)** | $224 \times 224$ | **2.59M** | **25.91 MB** | **89.70%** | **97.83%** | **98.96%** | **89.59%** | **Deployed in Production** |
| **EfficientNetB0 (Baseline)** | $224 \times 224$ | 4.35M | 43.12 MB | 88.47% | 96.69% | 98.30% | 88.31% | Comparative Baseline |

---

## 4. Scientific Web Service Integration Benchmarks

| Subsystem API | Endpoint / Provider | Protocol | Latency (avg) | Fallback Mechanism |
| :--- | :--- | :---: | :---: | :--- |
| **Taxonomy Match** | GBIF Species Match API | HTTPS GET | $\sim 280\text{ ms}$ | Cached botanical taxonomy hierarchy |
| **Phytochemicals** | PubChem PUG REST API | HTTPS GET | $\sim 350\text{ ms}$ | Curated PubChem CID profile |
| **Extraction Retrieval** | Europe PMC Search API | HTTPS GET | $\sim 420\text{ ms}$ | Curated Pharmacognosy Monograph Dict |
| **Safety Guidance** | WHO/IP Monograph Repository | Local DB / GET | $< 15\text{ ms}$ | Monograph Safety Schema |
| **Literature References** | Crossref Works API | HTTPS GET | $\sim 310\text{ ms}$ | Direct PubMed DOI resolver |

