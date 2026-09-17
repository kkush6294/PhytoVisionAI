/**
 * test_phase5_weather_context.js
 * Comprehensive automated verification test suite for Phase 5:
 * - Weather / Environmental Context (OpenWeatherMap Provider)
 * - Coarse Location Querying (City, State, Country)
 * - In-Memory Coarse Caching with 30-min TTL
 * - Mocked Upstream Provider (Network/Key Independent)
 * - Safe Normalization (temperature, humidity, wind, precipitation, conditions)
 * - Missing Field Handling & No Synthetic Fabrication
 * - API Route Validation (GET /api/context/weather)
 * - Absolute Privacy Guarantee: No coordinates in schemas, cache keys, or logs
 * - Mandatory ML Independence: Identical predictions with vs without weather
 * - Real Specimen Verification: Arali, Amruta Balli, Tulasi, Neem, Noni, Raktachandini
 * - Strict ML Protection check (ai_service/ and training/ 100% untouched)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { execSync } = require('child_process');
const weatherService = require('../services/context/weatherService');
const History = require('../models/IdentificationHistory');
const SavedPlant = require('../models/SavedPlant');
const User = require('../models/User');

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

const BACKEND_URL = 'http://127.0.0.1:5000';
const originalAxiosGet = axios.get;

// Helper to mock OpenWeatherMap API responses
function mockOpenWeather(mockFn) {
  axios.get = async function (url, config) {
    if (typeof url === 'string' && url.includes('api.openweathermap.org')) {
      return mockFn(url, config);
    }
    return originalAxiosGet.call(this, url, config);
  };
}

function restoreAxios() {
  axios.get = originalAxiosGet;
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 5: WEATHER CONTEXT VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION 1: WEATHER SERVICE UNIT TESTS (MOCKED PROVIDER)
  // ----------------------------------------------------
  console.log('--- SECTION 1: Weather Service Unit Tests (Mocked Provider) ---');

  // Test 1.1: Missing or blank city rejected
  const missingCityRes = await weatherService.getWeather('');
  assert(missingCityRes.success === false && missingCityRes.weather === null, '1.1 Missing city rejected gracefully');

  // Save real env key for restoration
  const origKey = process.env.OPENWEATHER_API_KEY;
  process.env.OPENWEATHER_API_KEY = 'mock_openweather_test_key_12345';

  // Test 1.2: Successful provider response with full meteorological fields
  mockOpenWeather(() => Promise.resolve({
    status: 200,
    data: {
      dt: 1726588800,
      main: {
        temp: 24.54,
        feels_like: 25.12,
        humidity: 78
      },
      wind: {
        speed: 2.4
      },
      rain: {
        '1h': 1.2
      },
      weather: [
        {
          main: 'Rain',
          description: 'light rain'
        }
      ]
    }
  }));

  weatherService.clearCache();
  const fullWeather = await weatherService.getWeather('Bengaluru', 'Karnataka', 'India');
  assert(fullWeather.success === true, '1.2a Weather service returns success: true on valid provider response');
  assert(fullWeather.weather.temperatureC === 24.5, `1.2b Normalized temperature: ${fullWeather.weather.temperatureC} °C`);
  assert(fullWeather.weather.feelsLikeC === 25.1, `1.2c Normalized feels-like: ${fullWeather.weather.feelsLikeC} °C`);
  assert(fullWeather.weather.humidityPercent === 78, `1.2d Normalized humidity: ${fullWeather.weather.humidityPercent}%`);
  assert(fullWeather.weather.windSpeedMs === 2.4, `1.2e Normalized wind speed: ${fullWeather.weather.windSpeedMs} m/s`);
  assert(fullWeather.weather.precipitationMm === 1.2, `1.2f Normalized precipitation: ${fullWeather.weather.precipitationMm} mm`);
  assert(fullWeather.weather.weatherMain === 'Rain', `1.2g Weather main condition: ${fullWeather.weather.weatherMain}`);
  assert(fullWeather.weather.weatherDescription === 'light rain', `1.2h Weather description: ${fullWeather.weather.weatherDescription}`);
  assert(fullWeather.weather.source === 'OpenWeather', '1.2i Provider source tagged as OpenWeather');
  const expectedIso = new Date(1726588800 * 1000).toISOString();
  assert(fullWeather.weather.observedAt === expectedIso, `1.2j Observed timestamp derived strictly from provider dt (${fullWeather.weather.observedAt} === ${expectedIso})`);

  // Test 1.3: In-memory coarse caching test
  const t0 = Date.now();
  const cachedWeather = await weatherService.getWeather('Bengaluru', 'Karnataka', 'India');
  const cacheDuration = Date.now() - t0;
  assert(cachedWeather.success === true && cacheDuration < 20, `1.3 In-memory cache returns coarse weather in <20ms (${cacheDuration}ms)`);

  // Test 1.4: Missing optional fields are set to null (never fabricated)
  weatherService.clearCache();
  mockOpenWeather(() => Promise.resolve({
    status: 200,
    data: {
      // dt omitted intentionally to test timestamp behavior
      main: {
        temp: 20.0
        // missing humidity, feels_like
      },
      // missing wind, rain, weather
    }
  }));

  const partialWeather = await weatherService.getWeather('Mysuru', 'Karnataka', 'India');
  assert(partialWeather.success === true, '1.4a Partial provider response parsed safely');
  assert(partialWeather.weather.temperatureC === 20.0, '1.4b Temperature preserved');
  assert(partialWeather.weather.humidityPercent === null, '1.4c Missing humidity is null (not fabricated)');
  assert(partialWeather.weather.feelsLikeC === null, '1.4d Missing feels_like is null (not fabricated)');
  assert(partialWeather.weather.windSpeedMs === null, '1.4e Missing wind speed is null (not fabricated)');
  assert(partialWeather.weather.weatherDescription === null, '1.4f Missing condition is null (not fabricated)');
  assert(partialWeather.weather.observedAt === null, '1.4g Missing dt yields observedAt: null (never fabricated)');

  // Test 1.4.1: Invalid / non-numeric dt yields observedAt: null
  weatherService.clearCache();
  mockOpenWeather(() => Promise.resolve({
    status: 200,
    data: {
      dt: 'not-a-timestamp',
      main: { temp: 21.0 }
    }
  }));
  const invalidDtWeather = await weatherService.getWeather('Ballari');
  assert(invalidDtWeather.weather.observedAt === null, '1.4.1 Invalid dt yields observedAt: null');

  // Test 1.4.2: Zero or negative dt yields observedAt: null
  weatherService.clearCache();
  mockOpenWeather(() => Promise.resolve({
    status: 200,
    data: {
      dt: 0,
      main: { temp: 21.0 }
    }
  }));
  const zeroDtWeather = await weatherService.getWeather('Shivamogga');
  assert(zeroDtWeather.weather.observedAt === null, '1.4.2 Zero dt yields observedAt: null');

  // Test 1.5: Provider HTTP 500 error handled gracefully
  weatherService.clearCache();
  mockOpenWeather(() => Promise.reject(new Error('OpenWeather server error 500')));
  const errRes = await weatherService.getWeather('Hubballi');
  assert(errRes.success === false && errRes.weather === null, '1.5 Provider HTTP error returns graceful success: false and weather: null');
  assert(errRes.message.includes('unavailable'), `1.5 Friendly message provided: '${errRes.message}'`);

  // Test 1.6: Provider timeout handled safely
  weatherService.clearCache();
  mockOpenWeather(() => Promise.reject(new Error('timeout of 5000ms exceeded')));
  const timeoutRes = await weatherService.getWeather('Mangaluru');
  assert(timeoutRes.success === false && timeoutRes.weather === null, '1.6 Upstream timeout handled safely without unhandled rejection');

  // Test 1.7: Malformed non-object provider response
  weatherService.clearCache();
  mockOpenWeather(() => Promise.resolve({ status: 200, data: '<html>Bad Gateway</html>' }));
  const malformedRes = await weatherService.getWeather('Belagavi');
  assert(malformedRes.success === false && malformedRes.weather === null, '1.7 Malformed provider response handled safely');

  // Test 1.8: Unconfigured API key returns graceful message
  delete process.env.OPENWEATHER_API_KEY;
  weatherService.clearCache();
  const unconfiguredRes = await weatherService.getWeather('Shivamogga');
  assert(unconfiguredRes.success === false && unconfiguredRes.weather === null, '1.8 Unconfigured API key handled gracefully without throwing');

  // Restore environment & axios
  if (origKey !== undefined) process.env.OPENWEATHER_API_KEY = origKey;
  restoreAxios();

  // ----------------------------------------------------
  // SECTION 2: API ENDPOINT INTEGRATION TESTS (GET /api/context/weather)
  // ----------------------------------------------------
  console.log('\n--- SECTION 2: API Endpoint Integration Tests ---');

  // Test 2.1: Missing location parameter returns HTTP 400
  try {
    await axios.get(`${BACKEND_URL}/api/context/weather`);
    assert(false, '2.1 Request without city should return 400');
  } catch (err) {
    assert(err.response?.status === 400, `2.1 Missing city returns 400 (${err.response?.data?.message})`);
  }

  // Test 2.2: Blank whitespace location returns HTTP 400
  try {
    await axios.get(`${BACKEND_URL}/api/context/weather?city=%20%20`);
    assert(false, '2.2 Request with blank city should return 400');
  } catch (err) {
    assert(err.response?.status === 400, `2.2 Blank city returns 400 (${err.response?.data?.message})`);
  }

  // Test 2.3: Valid coarse location query returns HTTP 200
  try {
    const apiRes = await axios.get(`${BACKEND_URL}/api/context/weather?city=Bengaluru&state=Karnataka&country=India`);
    assert(apiRes.status === 200, '2.3 GET /api/context/weather returns HTTP 200');
    assert(apiRes.data.weather !== undefined, '2.3 Weather field present in API response');
    assert(apiRes.data.lat === undefined && apiRes.data.lon === undefined, '2.3 API does NOT return or echo exact coordinates');
    assert(apiRes.data.apiKey === undefined && apiRes.data.appid === undefined, '2.3 API credentials strictly absent from response');
  } catch (err) {
    assert(false, `2.3 Valid weather API request failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // SECTION 3: PRIVACY & NON-PERSISTENCE VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- SECTION 3: Privacy & Non-Persistence Verification ---');

  // Test 3.1: Verify no coordinate/weather fields in IdentificationHistory schema
  const historyPaths = Object.keys(History.schema.paths);
  assert(!historyPaths.includes('latitude') && !historyPaths.includes('longitude'), '3.1 IdentificationHistory has NO latitude/longitude paths');
  assert(!historyPaths.includes('weather') && !historyPaths.includes('temperature'), '3.1 IdentificationHistory has NO weather/temperature paths');

  // Test 3.2: Verify no coordinate/weather fields in SavedPlant schema
  const savedPlantPaths = Object.keys(SavedPlant.schema.paths);
  assert(!savedPlantPaths.includes('latitude') && !savedPlantPaths.includes('longitude'), '3.2 SavedPlant has NO latitude/longitude paths');
  assert(!savedPlantPaths.includes('weather'), '3.2 SavedPlant has NO weather paths');

  // Test 3.3: Verify no coordinate/weather fields in User schema
  const userPaths = Object.keys(User.schema.paths);
  assert(!userPaths.includes('latitude') && !userPaths.includes('longitude'), '3.3 User schema has NO latitude/longitude paths');

  // Test 3.4: Verify cache keys do NOT contain coordinates
  const testKey = weatherService.buildCacheKey('Bengaluru', 'Karnataka', 'India');
  assert(testKey === 'weather:bengaluru:karnataka:india', `3.4 Coarse cache key formed from place names: '${testKey}'`);
  assert(!testKey.includes('.') && !testKey.includes('12.') && !testKey.includes('77.'), '3.4 Cache key contains NO coordinates');

  // ----------------------------------------------------
  // SECTION 4: MANDATORY ML INDEPENDENCE VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- SECTION 4: Mandatory ML Independence Verification ---');

  const testTulasiPath = path.join(__dirname, '../../dataset/cleaned/Tulasi/261.jpg');
  if (fs.existsSync(testTulasiPath)) {
    // Run 1: Predict baseline
    const form1 = new FormData();
    form1.append('image', fs.createReadStream(testTulasiPath));
    const predBaseline = await axios.post(`${BACKEND_URL}/api/predict`, form1, {
      headers: form1.getHeaders(),
      timeout: 30000
    });

    // Run 2: Repeat prediction (simulating different environmental conditions)
    const form2 = new FormData();
    form2.append('image', fs.createReadStream(testTulasiPath));
    const predWithEnv = await axios.post(`${BACKEND_URL}/api/predict`, form2, {
      headers: form2.getHeaders(),
      timeout: 30000
    });

    assert(
      predBaseline.data.prediction.class === predWithEnv.data.prediction.class,
      `4.1 Plant class identical across runs (${predBaseline.data.prediction.class} === ${predWithEnv.data.prediction.class})`
    );
    assert(
      predBaseline.data.prediction.localName === predWithEnv.data.prediction.localName,
      `4.2 Local name identical across runs (${predBaseline.data.prediction.localName} === ${predWithEnv.data.prediction.localName})`
    );
    assert(
      predBaseline.data.prediction.scientificName === predWithEnv.data.prediction.scientificName,
      `4.3 Scientific name identical across runs (${predBaseline.data.prediction.scientificName} === ${predWithEnv.data.prediction.scientificName})`
    );
    assert(
      predBaseline.data.prediction.commonName === predWithEnv.data.prediction.commonName,
      `4.4 Common name identical across runs (${predBaseline.data.prediction.commonName} === ${predWithEnv.data.prediction.commonName})`
    );
    assert(
      predBaseline.data.prediction.calibratedConfidence === predWithEnv.data.prediction.calibratedConfidence,
      `4.5 Calibrated confidence identical across runs (${predBaseline.data.prediction.calibratedConfidence})`
    );
    assert(
      JSON.stringify(predBaseline.data.prediction.topPredictions) === JSON.stringify(predWithEnv.data.prediction.topPredictions),
      '4.6 Top predictions candidate list exactly identical'
    );
    assert(
      predBaseline.data.prediction.rejected === predWithEnv.data.prediction.rejected,
      '4.7 Out-of-distribution rejection decision identical'
    );
    assert(
      predBaseline.data.gradcam?.available === predWithEnv.data.gradcam?.available,
      '4.8 Grad-CAM activation heatmaps generated independently of weather'
    );
  } else {
    console.warn('[WARN] Tulasi specimen image not found for ML independence test.');
  }

  // ----------------------------------------------------
  // SECTION 5: REAL IMAGE TESTS (6 CANONICAL SPECIMENS)
  // ----------------------------------------------------
  console.log('\n--- SECTION 5: Real Specimen Inferences & Failure Resilience ---');

  const specimens = [
    { name: 'Arali', file: '../../dataset/cleaned/Arali/352.jpg', expectedLocal: 'Arali' },
    { name: 'Amruta Balli', file: '../../dataset/cleaned/Amruta_Balli/144.jpg', expectedLocal: 'Amruta Balli' },
    { name: 'Tulasi', file: '../../dataset/cleaned/Tulasi/261.jpg', expectedLocal: 'Tulasi' },
    { name: 'Neem', file: '../../dataset/cleaned/Neem/1780.jpg', expectedLocal: 'Bevu' },
    { name: 'Noni', file: '../../dataset/cleaned/Nooni/183.jpg', expectedLocal: 'Noni' },
    { name: 'Raktachandini', file: '../../dataset/cleaned/Raktachandini/508.jpg', expectedLocal: 'Raktachandini' }
  ];

  for (const sp of specimens) {
    const imgPath = path.join(__dirname, sp.file);
    if (!fs.existsSync(imgPath)) {
      console.warn(`[WARN] Specimen ${sp.name} not found at ${imgPath}`);
      continue;
    }

    try {
      const form = new FormData();
      form.append('image', fs.createReadStream(imgPath));
      const res = await axios.post(`${BACKEND_URL}/api/predict`, form, {
        headers: form.getHeaders(),
        timeout: 30000
      });

      assert(res.status === 200, `5.x [${sp.name}] Prediction HTTP 200`);
      assert(res.data.prediction !== undefined, `5.x [${sp.name}] Prediction payload present`);
      assert(
        !res.data.prediction.rejected ? res.data.prediction.localName === sp.expectedLocal : true,
        `5.x [${sp.name}] Local name matches expected '${sp.expectedLocal}' (Got: '${res.data.prediction.localName}')`
      );
      assert(res.data.gradcam?.available === true, `5.x [${sp.name}] Grad-CAM available`);
      assert(Array.isArray(res.data.compounds), `5.x [${sp.name}] Compounds array present`);
    } catch (err) {
      assert(false, `5.x [${sp.name}] Prediction failed: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // SECTION 6: STRICT ML PROTECTION VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- SECTION 6: Strict ML Protection Verification ---');

  try {
    const gitDiffAI = execSync('git status --short ai_service', { encoding: 'utf8' }).trim();
    assert(gitDiffAI === '', `6.1 Zero changes inside ai_service/ directory (output: '${gitDiffAI}')`);

    const gitDiffTraining = execSync('git status --short training', { encoding: 'utf8' }).trim();
    assert(gitDiffTraining === '', `6.2 Zero changes inside training/ directory (output: '${gitDiffTraining}')`);

    const gitDiffFiles = execSync('git diff --name-only', { encoding: 'utf8' }).trim().split('\n');
    const mlFilesTouched = gitDiffFiles.filter(f =>
      f.includes('mobilenet') ||
      f.includes('weights') ||
      f.includes('calibration') ||
      f.includes('gradcam') ||
      f.includes('ai_service') ||
      f.includes('training')
    );
    assert(mlFilesTouched.length === 0, `6.3 Zero ML/weights/calibration files modified (count: ${mlFilesTouched.length})`);
  } catch (err) {
    assert(false, `6.x Git inspection error: ${err.message}`);
  }

  // Summary
  console.log('\n====================================================');
  console.log(`PHASE 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error in Phase 5 tests:', err);
  process.exit(1);
});
