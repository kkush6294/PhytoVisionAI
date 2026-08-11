"""
07_evaluate_models.py - Evaluate BOTH trained models on the UNTOUCHED test set.
"""
import os, sys, numpy as np
from tensorflow import keras
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common

MODELS = {
    "mobilenetv2": {"name": "mobilenetv2_best.keras", "preprocess": "mobilenet_v2"},
    "efficientnetb0": {"name": "efficientnetb0_best.keras", "preprocess": "efficientnet"},
}

def get_preprocess(name):
    if name == "mobilenet_v2":
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
        return preprocess_input
    from tensorflow.keras.applications.efficientnet import preprocess_input
    return preprocess_input

def main():
    class_names = common.get_class_names()
    results = {}
    for key, cfg in MODELS.items():
        model_path = os.path.join(common.MODEL_DIR, key, cfg["name"])
        if not os.path.exists(model_path):
            print("[SKIP]", key, "not found")
            continue
        print("=== Evaluating", key, "on TEST ===")
        model = keras.models.load_model(model_path, compile=False)
        preprocess_fn = get_preprocess(cfg["preprocess"])
        test_ds = common.build_dataset("test", class_names, preprocess_fn, augment=False)
        metrics = common.evaluate_model(model, test_ds, class_names)
        total_params, trainable_params = common.model_parameter_count(model)
        size_mb = common.model_file_size(model_path)
        result = {"model": key, "model_path": model_path,
                  "total_parameters": total_params,
                  "trainable_parameters": trainable_params,
                  "model_size_mb": round(size_mb, 2), **metrics}
        npz_path = os.path.join(common.REPORT_DIR, "test_predictions_" + key + ".npz")
        np.savez(npz_path, y_true=np.array(metrics["y_true"]),
                 y_pred=np.array(metrics["y_pred"]),
                 y_proba=np.array(metrics["y_proba"]))
        result.pop("y_true", None); result.pop("y_pred", None); result.pop("y_proba", None)
        out_json = os.path.join(common.REPORT_DIR, "eval_" + key + ".json")
        common.save_json(result, out_json)
        results[key] = result
        print("  Test acc :", round(result["top1_accuracy"], 4))
        print("  Top-3    :", round(result["top3_accuracy"], 4))
        print("  Top-5    :", round(result["top5_accuracy"], 4))
        print("  Macro F1 :", round(result["macro_f1"], 4))
        print("  Params   :", total_params)
        print("  Saved    :", out_json)
    common.save_json(results, os.path.join(common.REPORT_DIR, "eval_results.json"))

if __name__ == "__main__":
    main()
