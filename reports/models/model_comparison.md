# Model Comparison (Test Set)

Evaluated on the untouched test set. Classes: **40**

## Summary

| Model | Top-1 Acc | Top-3 Acc | Top-5 Acc | Macro F1 | Weighted F1 | Test n |
|-------|-----------|-----------|-----------|----------|-------------|--------|
| mobilenetv2 | 0.897 | 0.9783 | 0.9896 | 0.8959 | 0.8958 | 1058 |
| efficientnetb0 | 0.0444 | 0.0681 | 0.0983 | 0.0382 | 0.0349 | 1058 |

## Objective note (reporting only; final selection in Phase 10)

- Highest test Top-1 accuracy: **mobilenetv2** (0.897)
- Highest macro F1: **mobilenetv2** (0.8959)

Model selection must also consider calibration, per-class performance, inference speed, model size and unknown-image rejection (Phases 9-12).
## Per-class F1 (macro basis)

| Class | mobilenetv2 | efficientnetb0 |
|-------|---|---|
| Aloevera | 0.9615 | 0.5652 |
| Amla | 0.9778 | 0.9302 |
| Amruta_Balli | 0.5882 | 0.0 |
| Arali | 1.0 | 0.0345 |
| Ashoka | 0.9474 | 0.0 |
| Ashwagandha | 0.9545 | 0.0 |
| Avacado | 0.8077 | 0.0 |
| Bamboo | 0.9333 | 0.0 |
| Basale | 0.84 | 0.0 |
| Betel | 0.84 | 0.0 |
| Betel_Nut | 0.9565 | 0.0 |
| Brahmi | 0.9048 | 0.0 |
| Castor | 0.902 | 0.0 |
| Curry_Leaf | 0.9474 | 0.0 |
| Doddapatre | 0.902 | 0.0 |
| Ekka | 1.0 | 0.0 |
| Ganike | 0.8 | 0.0 |
| Gauva | 0.9167 | 0.0 |
| Geranium | 0.7917 | 0.0 |
| Henna | 0.7143 | 0.0 |
| Hibiscus | 0.8831 | 0.0 |
| Honge | 0.9302 | 0.0 |
| Insulin | 0.9756 | 0.0 |
| Jasmine | 0.8727 | 0.0 |
| Lemon | 0.881 | 0.0 |
| Lemon_grass | 0.9778 | 0.0 |
| Mango | 0.8 | 0.0 |
| Mint | 0.9167 | 0.0 |
| Nagadali | 0.7568 | 0.0 |
| Neem | 0.9143 | 0.0 |
| Nithyapushpa | 0.8936 | 0.0 |
| Nooni | 0.84 | 0.0 |
| Pappaya | 0.9583 | 0.0 |
| Pepper | 0.9545 | 0.0 |
| Pomegranate | 0.9767 | 0.0 |
| Raktachandini | 0.902 | 0.0 |
| Rose | 0.8846 | 0.0 |
| Sapota | 0.9459 | 0.0 |
| Tulasi | 0.8857 | 0.0 |
| Wood_sorel | 1.0 | 0.0 |
