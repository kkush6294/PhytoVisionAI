"""Temporary helper: verify final dataset class counts and TF environment."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common

# Final dataset class counts
d = common.FINAL_DATASET
classes = sorted(x for x in os.listdir(d) if os.path.isdir(os.path.join(d, x)))
print("=== FINAL DATASET ===")
print("num_classes:", len(classes))
total = 0
for c in classes:
    n = len(os.listdir(os.path.join(d, c)))
    total += n
    print(f"{c}: {n}")
print("TOTAL:", total)

# TF environment
import tensorflow as tf
print("\n=== TF ENV ===")
print("TF:", tf.__version__)
print("GPU:", tf.config.list_physical_devices("GPU"))
print("CPU:", tf.config.list_physical_devices("CPU"))
