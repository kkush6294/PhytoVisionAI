# Model Selection Report

## Objective

MobileNetV2 and EfficientNetB0 were compared using a documented weighted scoring rubric.

The following criteria were considered:

| Criterion | Weight |
|---|---:|
| top1_accuracy | 0.30 |
| macro_f1 | 0.25 |
| top5_accuracy | 0.10 |
| ece | 0.15 |
| inference_per_image_ms | 0.10 |
| model_size_mb | 0.10 |

## Raw values

| Model | top1_accuracy | macro_f1 | top5_accuracy | ece | inference_per_image_ms | model_size_mb |
|---|---|---|---|---|---|---|
| mobilenetv2 | 0.8970 | 0.8959 | 0.9896 | 1.0000 | 13.2860 | 25.9100 |
| efficientnetb0 | 0.0444 | 0.0382 | 0.0983 | 1.0000 | 22.6530 | 20.1000 |

## Normalized scores

| Model | top1_accuracy | macro_f1 | top5_accuracy | ece | inference_per_image_ms | model_size_mb | Weighted total |
|---|---|---|---|---|---|---|---|
| mobilenetv2 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | **0.9000** |
| efficientnetb0 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 1.0000 | **0.2500** |

## Winner: **mobilenetv2**

The selected model is **mobilenetv2** based on the documented weighted objective rubric.

Calibration temperature and rejection threshold were fitted using validation data. The test set was used strictly for final reporting and was not used to fit those parameters.

The selected model is intended to be used as the production model for the downstream AI service and evidence-generation pipeline.
