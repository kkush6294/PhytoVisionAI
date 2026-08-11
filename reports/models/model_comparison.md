# Model Comparison (Test Set)

Evaluated on the untouched test set. Classes: **30**

## Summary

| Model | Top-1 Acc | Top-3 Acc | Top-5 Acc | Macro F1 | Weighted F1 | Test n |
|-------|-----------|-----------|-----------|----------|-------------|--------|
| mobilenetv2 | 0.9199 | 0.9785 | 0.9892 | 0.9212 | 0.9189 | 836 |
| efficientnetb0 | 0.8349 | 0.939 | 0.9725 | 0.8346 | 0.8315 | 836 |

## Objective note (reporting only; final selection in Phase 10)

- Highest test Top-1 accuracy: **mobilenetv2** (0.9199)
- Highest macro F1: **mobilenetv2** (0.9212)

Model selection must also consider calibration, per-class performance, inference speed, model size and unknown-image rejection (Phases 9-12).
## Per-class F1 (macro basis)

| Class | mobilenetv2 | efficientnetb0 |
|-------|---|---|
| Aloevera | 0.963 | 0.8966 |
| Amla | 0.9362 | 0.8889 |
| Ashoka | 0.9744 | 0.9157 |
| Ashwagandha | 1.0 | 0.8235 |
| Betel | 0.9167 | 0.8163 |
| Brahmi | 0.9565 | 0.8696 |
| Castor | 0.96 | 0.7869 |
| Curry_Leaf | 0.9333 | 0.9041 |
| Doddapatre | 0.9787 | 0.8214 |
| Gauva | 0.9362 | 0.8571 |
| Geranium | 0.8163 | 0.8333 |
| Henna | 0.8 | 0.7576 |
| Hibiscus | 0.8941 | 0.7467 |
| Honge | 0.9778 | 0.8 |
| Insulin | 1.0 | 0.9767 |
| Jasmine | 0.8966 | 0.7347 |
| Lemon | 0.8636 | 0.7816 |
| Lemon_grass | 0.9565 | 0.9767 |
| Mango | 0.8511 | 0.7391 |
| Mint | 0.96 | 0.9459 |
| Nagadali | 0.9048 | 0.8205 |
| Neem | 0.9143 | 0.6667 |
| Pappaya | 0.902 | 0.7347 |
| Pepper | 0.9778 | 0.8302 |
| Pomegranate | 0.7895 | 0.7778 |
| Raktachandini | 0.9388 | 0.9362 |
| Rose | 0.7917 | 0.7556 |
| Sapota | 0.9867 | 0.9351 |
| Tulasi | 0.8824 | 0.7692 |
| Wood_sorel | 0.9787 | 0.9388 |
