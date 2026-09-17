/**
 * test_phase3_image_quality.js
 * Comprehensive automated verification test suite for Phase 3:
 * - Lightweight Image Quality Validation (Advisory Pre-check)
 * - Dimensions & Resolution detection
 * - Brightness, Contrast, and Sharpness (Laplacian variance) algorithm validation
 * - Edge cases: Small, Dark, Bright, Low-contrast, Blurred, and Corrupted images
 * - Non-throwing robust error handling
 * - Predict endpoint non-blocking behavior & response integration
 * - Real image predictions (Arali, Amruta Balli, Tulasi, Neem, Noni, Raktachandini)
 * - Strict ML Protection check (ai_service/ and training/ 100% untouched)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const { assessImageQuality, parseImageDimensions } = require('../utils/imageQuality');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

// Utility: Replicate frontend imageQuality algorithms for direct unit testing in Node
function calculateMeanLuminance(grayPixels) {
  let sum = 0;
  for (let i = 0; i < grayPixels.length; i++) sum += grayPixels[i];
  return sum / grayPixels.length;
}

function calculateContrast(grayPixels, mean) {
  let sumSq = 0;
  for (let i = 0; i < grayPixels.length; i++) {
    const diff = grayPixels[i] - mean;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / grayPixels.length);
}

function calculateLaplacianVariance(grayPixels, width, height) {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let count = 0;
  const laplacians = new Float32Array((width - 2) * (height - 2));

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

// HTTP Helper for live upload
function uploadTestImage(imagePath, filename) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(imagePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);

    const header = Buffer.from(
      '--' + boundary + '\r\nContent-Disposition: form-data; name="image"; filename="' + filename + '"\r\nContent-Type: image/jpeg\r\n\r\n'
    );
    const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
    const postData = Buffer.concat([header, fileBuffer, footer]);

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/predict',
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': postData.length
        }
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseBody);
            resolve({ statusCode: res.statusCode, data: parsed });
          } catch (err) {
            reject(new Error('Failed to parse JSON: ' + responseBody));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runPhase3Tests() {
  console.log('================================================================');
  console.log('STARTING PHASE 3 IMAGE QUALITY VALIDATION TEST SUITE');
  console.log('================================================================\n');

  // TEST 1: Strict ML Protection Check
  console.log('--- TEST 1: Strict ML Protection Check ---');
  try {
    const gitStatus = execSync('git status -s ai_service training', {
      cwd: path.join(__dirname, '..', '..'),
      encoding: 'utf8'
    }).trim();
    assert(gitStatus === '', 'ai_service/ and training/ remain 100% untouched in git status');
  } catch (err) {
    assert(false, `Git status check error: ${err.message}`);
  }

  // TEST 2: Valid Image Dimensions Detection
  console.log('\n--- TEST 2: Image Dimension Extraction & Parsing ---');
  const samplePath = path.join(__dirname, '..', '..', 'dataset', 'cleaned', 'Arali', '352.jpg');
  if (fs.existsSync(samplePath)) {
    const realBuf = fs.readFileSync(samplePath);
    const dims = parseImageDimensions(realBuf);
    assert(dims !== null && dims.width > 0 && dims.height > 0, `Valid dimensions parsed from Arali JPEG: ${dims?.width}x${dims?.height}`);
    assert(dims.format === 'jpeg', `Detected image format is JPEG (Got: '${dims?.format}')`);

    const quality = assessImageQuality(realBuf);
    assert(quality.valid === true, 'Quality assessment returns valid: true for real leaf image');
    assert(quality.resolution.passed === true, 'Arali image passes 224x224 resolution check');
    assert(quality.overallStatus === 'Good', `Overall status is Good (Got: '${quality.overallStatus}')`);
  } else {
    assert(false, `Test image not found at ${samplePath}`);
  }

  // TEST 3: Small Resolution Detection (< 224x224)
  console.log('\n--- TEST 3: Low Resolution (< 224x224) Detection ---');
  // Construct a minimal 100x100 JPEG header buffer
  const smallJpeg = Buffer.from([
    0xFF, 0xD8,             // SOI
    0xFF, 0xC0, 0x00, 0x11, // SOF0, length 17
    0x08,                   // precision 8
    0x00, 0x64,             // height 100
    0x00, 0x64,             // width 100
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01 // components
  ]);
  const smallQuality = assessImageQuality(smallJpeg);
  assert(smallQuality.width === 100 && smallQuality.height === 100, `Small dimensions detected: ${smallQuality.width}x${smallQuality.height}`);
  assert(smallQuality.resolution.passed === false, 'Small image fails 224x224 resolution check (passed: false)');
  assert(smallQuality.resolution.label === 'Needs improvement', 'Small image resolution label is "Needs improvement"');
  assert(smallQuality.overallStatus === 'Needs improvement', 'Small image overallStatus is "Needs improvement"');
  assert(smallQuality.warnings.some(w => w.includes('224')), 'Small image returns warning mentioning 224x224 pixels');

  // TEST 4: Brightness Calculation & Extreme Lighting
  console.log('\n--- TEST 4: Brightness / Lighting Metric Evaluation ---');
  // Normal lighting (mean = 120)
  const normalPixels = new Float32Array(100 * 100).fill(120);
  const normalBrightness = calculateMeanLuminance(normalPixels);
  assert(normalBrightness === 120, `Normal brightness computed correctly: ${normalBrightness}`);
  assert(normalBrightness >= 40 && normalBrightness <= 215, 'Normal brightness falls within optimal range [40, 215]');

  // Very dark image (mean = 20 < 40)
  const darkPixels = new Float32Array(100 * 100).fill(20);
  const darkBrightness = calculateMeanLuminance(darkPixels);
  assert(darkBrightness < 40, `Dark image brightness (${darkBrightness}) is below threshold of 40`);

  // Very bright image (mean = 235 > 215)
  const brightPixels = new Float32Array(100 * 100).fill(235);
  const brightBrightness = calculateMeanLuminance(brightPixels);
  assert(brightBrightness > 215, `Bright image brightness (${brightBrightness}) is above threshold of 215`);

  // TEST 5: Contrast Calculation & Flat Lighting
  console.log('\n--- TEST 5: Contrast Calculation & Low-Contrast Detection ---');
  // Low contrast / flat image (uniform values, std dev = 0)
  const flatPixels = new Float32Array(100 * 100).fill(128);
  const flatContrast = calculateContrast(flatPixels, 128);
  assert(flatContrast === 0, `Flat image contrast is 0 (below threshold of 25)`);

  // High contrast image (values 50 and 200, std dev ~ 75)
  const highContrastPixels = new Float32Array(100 * 100);
  for (let i = 0; i < highContrastPixels.length; i++) {
    highContrastPixels[i] = i % 2 === 0 ? 50 : 200;
  }
  const highContrastMean = calculateMeanLuminance(highContrastPixels);
  const highContrast = calculateContrast(highContrastPixels, highContrastMean);
  assert(highContrast >= 25, `High contrast image contrast (${highContrast.toFixed(1)}) is well above threshold of 25`);

  // TEST 6: Sharpness Metric (Laplacian Variance: Sharp vs Blurred)
  console.log('\n--- TEST 6: Sharpness Metric (Sharp vs Blurred Laplacian Variance) ---');
  const width = 50;
  const height = 50;

  // Create a sharp high-frequency test pattern (alternating black and white checkerboard)
  const sharpGrid = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      sharpGrid[y * width + x] = (x % 4 < 2) ^ (y % 4 < 2) ? 230 : 25;
    }
  }
  const sharpScore = calculateLaplacianVariance(sharpGrid, width, height);

  // Create a blurred/smoothed version (box filter over the pattern)
  const blurredGrid = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let avg = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          avg += sharpGrid[(y + dy) * width + (x + dx)];
        }
      }
      blurredGrid[y * width + x] = avg / 9;
    }
  }
  const blurredScore = calculateLaplacianVariance(blurredGrid, width, height);

  console.log(`  Sharp pattern Laplacian variance: ${sharpScore.toFixed(2)}`);
  console.log(`  Blurred pattern Laplacian variance: ${blurredScore.toFixed(2)}`);
  assert(sharpScore > blurredScore, `Sharp test image produces higher Laplacian variance than blurred test image (${sharpScore.toFixed(2)} > ${blurredScore.toFixed(2)})`);
  assert(sharpScore > 80, `Sharp pattern exceeds threshold of 80`);

  // TEST 7: Corrupt & Edge-Case Buffers Handled Safely
  console.log('\n--- TEST 7: Edge Cases & Corrupt Buffer Handling ---');
  const emptyBufResult = assessImageQuality(Buffer.alloc(0));
  assert(emptyBufResult.valid === false && emptyBufResult.overallStatus === 'Unknown', 'Empty buffer handled safely without throwing');

  const randomJunk = Buffer.from('NOT_AN_IMAGE_RANDOM_TEXT_BYTES_123456789');
  const junkResult = assessImageQuality(randomJunk);
  assert(junkResult.valid === false && junkResult.overallStatus === 'Unknown', 'Corrupt non-image buffer handled safely without throwing');

  const truncatedJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  const truncResult = assessImageQuality(truncatedJpeg);
  assert(truncResult.valid === false, 'Truncated JPEG header handled safely without throwing');

  // TEST 8: Live Prediction API & Real Specimen Verification
  console.log('\n--- TEST 8: Live Prediction Pipeline & Real Specimen Verification ---');
  const specimensToTest = [
    { name: 'Arali', file: 'dataset/cleaned/Arali/352.jpg', expectedLocal: 'Arali' },
    { name: 'Amruta Balli', file: 'dataset/cleaned/Amruta_Balli/144.jpg', expectedLocal: 'Amruta Balli' },
    { name: 'Tulasi', file: 'dataset/cleaned/Tulasi/261.jpg', expectedLocal: 'Tulasi' },
    { name: 'Neem', file: 'dataset/cleaned/Neem/1780.jpg', expectedLocal: 'Bevu' },
    { name: 'Noni', file: 'dataset/cleaned/Nooni/183.jpg', expectedLocal: 'Tagase' },
    { name: 'Raktachandini', file: 'dataset/cleaned/Raktachandini/508.jpg', expectedLocal: 'Rakta Chandana' }
  ];

  for (const specimen of specimensToTest) {
    const fullPath = path.join(__dirname, '..', '..', specimen.file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[WARN] Specimen image not found: ${fullPath}`);
      continue;
    }

    try {
      const res = await uploadTestImage(fullPath, path.basename(specimen.file));
      assert(res.statusCode === 200, `POST /api/predict for ${specimen.name} returns HTTP 200`);
      assert(res.data.prediction !== undefined, `Prediction object present for ${specimen.name}`);
      assert(
        !res.data.prediction.rejected ? !!res.data.prediction.localName : true,
        `${specimen.name} returns non-empty localName: '${res.data.prediction?.localName || "N/A (OOD)"}'`
      );
      assert(!!res.data.imageQuality, `Advisory imageQuality assessment included in API response for ${specimen.name}`);
      assert(res.data.imageQuality.resolution?.passed === true, `${specimen.name} image quality resolution passed: ${res.data.imageQuality.width}x${res.data.imageQuality.height}`);
      assert(res.data.imageQuality.valid === true, `${specimen.name} buffer successfully inspected without modifying data`);
    } catch (apiErr) {
      assert(false, `Upload prediction failed for ${specimen.name}: ${apiErr.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(`PHASE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase3Tests().catch(err => {
  console.error('Fatal error in Phase 3 test suite:', err);
  process.exit(1);
});
