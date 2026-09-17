/**
 * imageQuality.js - Lightweight Client-Side Image Quality Assessment
 * 
 * Evaluates botanical leaf images on:
 * 1. Resolution (recommended min 224x224)
 * 2. Brightness / Lighting (mean luminance)
 * 3. Contrast (luminance standard deviation)
 * 4. Sharpness / Blur (discrete Laplacian variance)
 * 
 * IMPORTANT:
 * - All thresholds are documented heuristics for botanical specimen quality.
 * - This is an ADVISORY PRE-CHECK only and NEVER blocks image upload or prediction.
 */

export const QUALITY_THRESHOLDS = {
  MIN_WIDTH: 224,
  MIN_HEIGHT: 224,
  MIN_BRIGHTNESS: 40,   // Below this luminance (0-255) is underexposed/dark
  MAX_BRIGHTNESS: 215,  // Above this luminance (0-255) is overexposed/washed out
  MIN_CONTRAST: 25,     // Standard deviation of luminance below this is low-contrast
  MIN_SHARPNESS: 80,    // Laplacian variance threshold for sharpness
  ANALYSIS_SAMPLE_SIZE: 300 // Max dimension for fast canvas pixel sampling
};

/**
 * Assesses the quality of an image File object.
 * @param {File|Blob} file - The selected image file
 * @returns {Promise<Object>} Quality assessment report
 */
export async function assessImageQuality(file) {
  // Safe fallback response when assessment cannot be performed
  const createUnavailableReport = (message = "Image quality could not be assessed.") => ({
    width: 0,
    height: 0,
    resolution: { passed: true, label: "Could not assess" },
    brightness: { value: 0, passed: true, label: "Could not assess" },
    contrast: { value: 0, passed: true, label: "Could not assess" },
    sharpness: { value: 0, passed: true, label: "Could not assess" },
    overallStatus: "Unknown",
    warnings: [message],
    advice: null,
    error: true
  });

  if (!file) {
    return createUnavailableReport("No file provided for image quality assessment.");
  }

  // Ensure file is an image
  if (file.type && !file.type.startsWith("image/")) {
    return createUnavailableReport("Selected file is not an image.");
  }

  return new Promise((resolve) => {
    try {
      let objectUrl = null;
      try {
        objectUrl = URL.createObjectURL(file);
      } catch {
        return resolve(createUnavailableReport("Could not read file object."));
      }

      const img = new Image();

      // Ensure cleanup of object URL
      const cleanup = () => {
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
            // Ignore revoke errors
          }
        }
      };

      img.onload = () => {
        try {
          const naturalWidth = img.naturalWidth || img.width || 0;
          const naturalHeight = img.naturalHeight || img.height || 0;

          if (naturalWidth === 0 || naturalHeight === 0) {
            cleanup();
            return resolve(createUnavailableReport("Image has zero dimensions."));
          }

          // 1. Resolution Check
          const resolutionPassed =
            naturalWidth >= QUALITY_THRESHOLDS.MIN_WIDTH &&
            naturalHeight >= QUALITY_THRESHOLDS.MIN_HEIGHT;
          const resolutionLabel = resolutionPassed ? "Passed" : "Needs improvement";

          // Perform lightweight canvas analysis on a scaled sample
          const sample = sampleCanvasPixels(img, naturalWidth, naturalHeight);

          if (!sample) {
            cleanup();
            // Canvas unavailable - return resolution only without throwing
            const overall = resolutionPassed ? "Good" : "Needs improvement";
            return resolve({
              width: naturalWidth,
              height: naturalHeight,
              resolution: { passed: resolutionPassed, label: resolutionLabel },
              brightness: { value: 128, passed: true, label: "Assumed Good" },
              contrast: { value: 50, passed: true, label: "Assumed Good" },
              sharpness: { value: 100, passed: true, label: "Assumed Good" },
              overallStatus: overall,
              warnings: resolutionPassed ? [] : ["Resolution is below recommended 224x224 pixels."],
              advice: resolutionPassed ? null : "Try uploading a higher-resolution image with the leaf filling more of the frame."
            });
          }

          const { grayPixels, sampleWidth, sampleHeight } = sample;

          // 2. Brightness Calculation (Mean luminance, 0-255)
          const brightnessVal = calculateMeanLuminance(grayPixels);
          const brightnessPassed =
            brightnessVal >= QUALITY_THRESHOLDS.MIN_BRIGHTNESS &&
            brightnessVal <= QUALITY_THRESHOLDS.MAX_BRIGHTNESS;
          let brightnessLabel = "Good";
          if (brightnessVal < QUALITY_THRESHOLDS.MIN_BRIGHTNESS) {
            brightnessLabel = "Needs improvement";
          } else if (brightnessVal > QUALITY_THRESHOLDS.MAX_BRIGHTNESS) {
            brightnessLabel = "Needs improvement";
          }

          // 3. Contrast Calculation (Standard deviation of luminance)
          const contrastVal = calculateContrast(grayPixels, brightnessVal);
          const contrastPassed = contrastVal >= QUALITY_THRESHOLDS.MIN_CONTRAST;
          const contrastLabel = contrastPassed ? "Good" : "Needs improvement";

          // 4. Sharpness Calculation (Laplacian variance)
          const sharpnessVal = calculateLaplacianVariance(grayPixels, sampleWidth, sampleHeight);
          const sharpnessPassed = sharpnessVal >= QUALITY_THRESHOLDS.MIN_SHARPNESS;
          const sharpnessLabel = sharpnessPassed ? "Good" : "Needs improvement";

          // Warnings and Overall Status Calculation
          const warnings = [];
          if (!resolutionPassed) {
            warnings.push(`Image resolution (${naturalWidth}×${naturalHeight}) is below recommended 224×224 pixels.`);
          }
          if (brightnessVal < QUALITY_THRESHOLDS.MIN_BRIGHTNESS) {
            warnings.push("Image appears relatively dark or underexposed.");
          } else if (brightnessVal > QUALITY_THRESHOLDS.MAX_BRIGHTNESS) {
            warnings.push("Image appears excessively bright or overexposed.");
          }
          if (!contrastPassed) {
            warnings.push("Image has low contrast, which may obscure leaf venation patterns.");
          }
          if (!sharpnessPassed) {
            warnings.push("Image appears blurry or out of focus.");
          }

          // Score: count passed metrics (out of 4)
          const passedCount = [resolutionPassed, brightnessPassed, contrastPassed, sharpnessPassed]
            .filter(Boolean).length;

          let overallStatus = "Good";
          if (passedCount === 4) {
            overallStatus = "Good";
          } else if (passedCount === 3) {
            overallStatus = "Fair";
          } else {
            overallStatus = "Needs improvement";
          }

          let advice = null;
          if (warnings.length > 0) {
            advice = "Try uploading a sharper, well-lit image with the leaf filling more of the frame.";
          }

          cleanup();

          return resolve({
            width: naturalWidth,
            height: naturalHeight,
            resolution: {
              passed: resolutionPassed,
              label: resolutionLabel
            },
            brightness: {
              value: Math.round(brightnessVal * 10) / 10,
              passed: brightnessPassed,
              label: brightnessLabel
            },
            contrast: {
              value: Math.round(contrastVal * 10) / 10,
              passed: contrastPassed,
              label: contrastLabel
            },
            sharpness: {
              value: Math.round(sharpnessVal * 10) / 10,
              passed: sharpnessPassed,
              label: sharpnessLabel
            },
            overallStatus,
            warnings,
            advice
          });

        } catch (innerErr) {
          cleanup();
          return resolve(createUnavailableReport(`Analysis interrupted: ${innerErr.message}`));
        }
      };

      img.onerror = () => {
        cleanup();
        return resolve(createUnavailableReport("Failed to decode image data."));
      };

      img.src = objectUrl;

    } catch (outerErr) {
      return resolve(createUnavailableReport(`Assessment error: ${outerErr.message}`));
    }
  });
}

/**
 * Samples image onto an offscreen canvas and extracts 8-bit grayscale pixel array.
 */
function sampleCanvasPixels(img, width, height) {
  try {
    if (typeof document === "undefined") return null;

    const maxDim = QUALITY_THRESHOLDS.ANALYSIS_SAMPLE_SIZE;
    let sampleWidth = width;
    let sampleHeight = height;

    if (sampleWidth > maxDim || sampleHeight > maxDim) {
      if (sampleWidth > sampleHeight) {
        sampleHeight = Math.round((sampleHeight * maxDim) / sampleWidth);
        sampleWidth = maxDim;
      } else {
        sampleWidth = Math.round((sampleWidth * maxDim) / sampleHeight);
        sampleHeight = maxDim;
      }
    }

    sampleWidth = Math.max(1, sampleWidth);
    sampleHeight = Math.max(1, sampleHeight);

    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imgData.data;

    // Convert RGBA to Grayscale luminance array (0-255) using ITU-R BT.709
    const totalPixels = sampleWidth * sampleHeight;
    const grayPixels = new Float32Array(totalPixels);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      // Luminance = 0.2126*R + 0.7152*G + 0.0722*B
      grayPixels[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }

    return { grayPixels, sampleWidth, sampleHeight };
  } catch {
    return null;
  }
}

/**
 * Calculates mean luminance across pixels.
 */
function calculateMeanLuminance(grayPixels) {
  let sum = 0;
  for (let i = 0; i < grayPixels.length; i++) {
    sum += grayPixels[i];
  }
  return sum / grayPixels.length;
}

/**
 * Calculates luminance standard deviation as a contrast measure.
 */
function calculateContrast(grayPixels, mean) {
  let sumSq = 0;
  for (let i = 0; i < grayPixels.length; i++) {
    const diff = grayPixels[i] - mean;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / grayPixels.length);
}

/**
 * Calculates discrete Laplacian variance across 2D pixel grid.
 * Approximates sharpness / edge energy.
 */
function calculateLaplacianVariance(grayPixels, width, height) {
  if (width < 3 || height < 3) return 0;

  let sum = 0;
  let count = 0;
  const laplacians = new Float32Array((width - 2) * (height - 2));

  // Apply standard 4-neighbor Laplacian kernel:
  // [ 0  1  0 ]
  // [ 1 -4  1 ]
  // [ 0  1  0 ]
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const prevRowOffset = (y - 1) * width;
    const nextRowOffset = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const center = grayPixels[rowOffset + x];
      const lap =
        grayPixels[prevRowOffset + x] +
        grayPixels[nextRowOffset + x] +
        grayPixels[rowOffset + x - 1] +
        grayPixels[rowOffset + x + 1] -
        4 * center;

      laplacians[count] = lap;
      sum += lap;
      count++;
    }
  }

  if (count === 0) return 0;

  const mean = sum / count;
  let varianceSum = 0;
  for (let i = 0; i < count; i++) {
    const diff = laplacians[i] - mean;
    varianceSum += diff * diff;
  }

  return varianceSum / count;
}
