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
| mobilenetv2 | 0.9199 | 0.9212 | 0.9892 | 1.0000 | 11.4539 | 25.8800 |
| efficientnetb0 | 0.8349 | 0.8346 | 0.9725 | 1.0000 | 14.4491 | 20.1000 |

## Normalized scores

| Model | top1_accuracy | macro_f1 | top5_accuracy | ece | inference_per_image_ms | model_size_mb | Weighted total |
|---|---|---|---|---|---|---|---|
| mobilenetv2 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | **0.9000** |
| efficientnetb0 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 1.0000 | **0.2500** |

## Winner: **mobilenetv2**

The selected model is **mobilenetv2** based on the documented weighted objective rubric.

Calibration temperature and rejection threshold were fitted using validation data. The test set was used strictly for final reporting and was not used to fit those parameters.

The selected model is intended to be used as the production model for the downstream AI service and evidence-generation pipeline.
