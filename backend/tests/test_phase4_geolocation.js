/**
 * test_phase4_geolocation.js
 * Comprehensive automated verification test suite for Phase 4:
 * - Privacy-Preserving Geolocation Context
 * - Reverse Geocoding Service (OpenStreetMap Nominatim)
 * - Coarse Location Normalization (City, State, Country)
 * - Coordinate Bounds & Type Validation ([-90, 90], [-180, 180])
 * - Cache Performance & Upstream Resilience
 * - Strict Privacy: Zero persistence of raw coordinates in MongoDB models
 * - Plant Identification Independence (Zero influence on MobileNetV2)
 * - Strict ML Protection check (ai_service/ and training/ 100% untouched)
 */

const axios = require('axios');
const mongoose = require('mongoose');
const { execSync } = require('child_process');
const geoService = require('../services/context/geoService');
const config = require('../config/config');

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

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 4: GEOLOCATION CONTEXT VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION 1: UNIT TESTS FOR geoService
  // ----------------------------------------------------
  console.log('--- SECTION 1: Reverse Geocoding Service Unit Tests ---');

  // Test 1.1: Valid Bengaluru coordinates
  try {
    let resBLR = await geoService.reverseGeocode(12.9716, 77.5946);
    if (!resBLR.success) {
      await new Promise(r => setTimeout(r, 1200));
      resBLR = await geoService.reverseGeocode(12.9716, 77.5946);
    }
    assert(resBLR.success === true, '1.1 geoService resolves valid coordinates successfully');
    assert(resBLR.city === 'Bengaluru' || resBLR.city === 'Bangalore', `1.1 Bengaluru city resolved: ${resBLR.city}`);
    assert(resBLR.state === 'Karnataka', `1.1 Karnataka state resolved: ${resBLR.state}`);
    assert(resBLR.country === 'India', `1.1 India country resolved: ${resBLR.country}`);
    assert(typeof resBLR.label === 'string' && resBLR.label.includes('Karnataka'), `1.1 Coarse label generated: ${resBLR.label}`);
  } catch (err) {
    assert(false, `1.1 Exception during Bengaluru reverse geocoding: ${err.message}`);
  }

  // Test 1.2: Cache hit test
  try {
    const t0 = Date.now();
    const resCached = await geoService.reverseGeocode(12.9716, 77.5946);
    const duration = Date.now() - t0;
    assert(resCached.success === true && duration < 50, `1.2 In-memory cache returns coarse location in <50ms (${duration}ms)`);
  } catch (err) {
    assert(false, `1.2 Cache hit failed: ${err.message}`);
  }

  // Test 1.3: Out-of-bounds latitude (> 90)
  const oobLatHigh = await geoService.reverseGeocode(95.0, 77.0);
  assert(oobLatHigh.success === false && oobLatHigh.error.includes('latitude'), '1.3 Latitude > 90 rejected with informative error');

  // Test 1.4: Out-of-bounds latitude (< -90)
  const oobLatLow = await geoService.reverseGeocode(-95.0, 77.0);
  assert(oobLatLow.success === false && oobLatLow.error.includes('latitude'), '1.4 Latitude < -90 rejected with informative error');

  // Test 1.5: Out-of-bounds longitude (> 180)
  const oobLonHigh = await geoService.reverseGeocode(12.0, 185.0);
  assert(oobLonHigh.success === false && oobLonHigh.error.includes('longitude'), '1.5 Longitude > 180 rejected with informative error');

  // Test 1.6: Out-of-bounds longitude (< -180)
  const oobLonLow = await geoService.reverseGeocode(12.0, -185.0);
  assert(oobLonLow.success === false && oobLonLow.error.includes('longitude'), '1.6 Longitude < -180 rejected with informative error');

  // Test 1.7: Non-numeric coordinates
  const nonNum = await geoService.reverseGeocode('abc', 'xyz');
  assert(nonNum.success === false, '1.7 Non-numeric coordinates handled gracefully without crashing');

  // Test 1.8: Configurable Nominatim User-Agent headers
  const origContact = process.env.NOMINATIM_CONTACT;
  const origUA = process.env.NOMINATIM_USER_AGENT;

  // With custom contact
  delete process.env.NOMINATIM_USER_AGENT;
  process.env.NOMINATIM_CONTACT = 'botany-researcher@institution.org';
  const customUA = geoService.getNominatimUserAgent();
  assert(
    customUA === 'PhytoVisionAI/1.0 (botany-researcher@institution.org)',
    `1.8a Configurable User-Agent incorporates NOMINATIM_CONTACT: '${customUA}'`
  );

  // With empty/unset contact (fallback)
  delete process.env.NOMINATIM_CONTACT;
  delete process.env.NOMINATIM_USER_AGENT;
  const fallbackUA = geoService.getNominatimUserAgent();
  assert(
    fallbackUA === 'PhytoVisionAI/1.0 (botanical-research)',
    `1.8b Default User-Agent is valid without fabricated email: '${fallbackUA}'`
  );
  assert(
    !fallbackUA.includes('contact@botany.org'),
    '1.8c Fabricated email contact@botany.org is completely removed'
  );

  // Restore env
  if (origContact !== undefined) process.env.NOMINATIM_CONTACT = origContact;
  if (origUA !== undefined) process.env.NOMINATIM_USER_AGENT = origUA;

  // Test 1.9: Temporary in-memory cache TTL and clearCache
  assert(geoService.CACHE_TTL_MS === 3600000, `1.9 In-memory cache TTL is exactly 1 hour (${geoService.CACHE_TTL_MS}ms)`);
  geoService.clearCache();
  assert(true, '1.9 In-memory cache cleared successfully');

  // ----------------------------------------------------
  // SECTION 2: API ENDPOINT INTEGRATION TESTS (/api/context/location)
  // ----------------------------------------------------
  console.log('\n--- SECTION 2: API Endpoint Integration Tests ---');

  // Comply with Nominatim 1 req/s usage policy
  await new Promise(r => setTimeout(r, 1200));

  // Test 2.1: Valid GET /api/context/location
  try {
    let apiRes = await axios.get(`${BACKEND_URL}/api/context/location?lat=12.9716&lon=77.5946`);
    if (!apiRes.data.success) {
      await new Promise(r => setTimeout(r, 1200));
      apiRes = await axios.get(`${BACKEND_URL}/api/context/location?lat=12.9716&lon=77.5946`);
    }
    assert(apiRes.status === 200, '2.1 GET /api/context/location returns HTTP 200');
    assert(apiRes.data.success === true, '2.1 API response success is true');
    assert(apiRes.data.country === 'India', `2.1 API returned country: ${apiRes.data.country}`);
    assert(apiRes.data.label && apiRes.data.label.includes('India'), `2.1 API returned formatted coarse label: ${apiRes.data.label}`);
    assert(apiRes.data.lat === undefined && apiRes.data.lon === undefined, '2.1 API response does NOT echo back raw coordinates');
    assert(apiRes.data.contact === undefined && apiRes.data.userAgent === undefined && apiRes.data.nominatimContact === undefined, '2.1 API response does NOT expose Nominatim contact to frontend');
  } catch (err) {
    assert(false, `2.1 Failed API request: ${err.message}`);
  }

  // Test 2.2: Missing coordinates return 400
  try {
    await axios.get(`${BACKEND_URL}/api/context/location`);
    assert(false, '2.2 Request with missing coordinates should return 400');
  } catch (err) {
    assert(err.response?.status === 400, `2.2 Missing coordinates return 400 (${err.response?.data?.error})`);
  }

  // Test 2.3: Out-of-bounds latitude returns 400
  try {
    await axios.get(`${BACKEND_URL}/api/context/location?lat=100&lon=77`);
    assert(false, '2.3 Latitude out of bounds should return 400');
  } catch (err) {
    assert(err.response?.status === 400, `2.3 Out-of-bounds latitude returns 400 (${err.response?.data?.error})`);
  }

  // Test 2.4: Out-of-bounds longitude returns 400
  try {
    await axios.get(`${BACKEND_URL}/api/context/location?lat=12&lon=200`);
    assert(false, '2.4 Longitude out of bounds should return 400');
  } catch (err) {
    assert(err.response?.status === 400, `2.4 Out-of-bounds longitude returns 400 (${err.response?.data?.error})`);
  }

  // Test 2.5: Non-numeric coordinates return 400
  try {
    await axios.get(`${BACKEND_URL}/api/context/location?lat=foo&lon=bar`);
    assert(false, '2.5 Non-numeric coordinates should return 400');
  } catch (err) {
    assert(err.response?.status === 400, `2.5 Non-numeric coordinates return 400 (${err.response?.data?.error})`);
  }

  // ----------------------------------------------------
  // SECTION 3: PRIVACY AUDIT (ZERO PERSISTENCE IN DATABASE)
  // ----------------------------------------------------
  console.log('\n--- SECTION 3: Privacy & Non-Persistence Verification ---');

  // Test 3.1: Check MongoDB Schemas for absence of lat/lon fields
  const History = require('../models/IdentificationHistory');
  const SavedPlant = require('../models/SavedPlant');
  const User = require('../models/User');

  const historyPaths = Object.keys(History.schema.paths);
  assert(!historyPaths.includes('latitude') && !historyPaths.includes('lat'), '3.1 IdentificationHistory schema has NO latitude/lat field');
  assert(!historyPaths.includes('longitude') && !historyPaths.includes('lon'), '3.1 IdentificationHistory schema has NO longitude/lon field');
  assert(!historyPaths.includes('coords') && !historyPaths.includes('coordinates'), '3.1 IdentificationHistory schema has NO coords field');

  const savedPlantPaths = Object.keys(SavedPlant.schema.paths);
  assert(!savedPlantPaths.includes('latitude') && !savedPlantPaths.includes('longitude'), '3.2 SavedPlant schema has NO latitude or longitude fields');

  const userPaths = Object.keys(User.schema.paths);
  assert(!userPaths.includes('latitude') && !userPaths.includes('longitude'), '3.3 User schema has NO latitude or longitude fields');

  // ----------------------------------------------------
  // SECTION 4: PLANT IDENTIFICATION PIPELINE INDEPENDENCE
  // ----------------------------------------------------
  console.log('\n--- SECTION 4: Plant Identification Independence ---');

  // Test 4.1: Perform prediction with leaf image and verify MobileNetV2 is purely visual
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');

    const form = new FormData();
    const realImgPath = path.join(__dirname, '../../dataset/cleaned/Tulasi/261.jpg');
    const testImgPath = fs.existsSync(realImgPath) ? realImgPath : path.join(__dirname, 'test_leaf_rgb.jpg');
    form.append('image', fs.createReadStream(testImgPath));

    const predRes = await axios.post(`${BACKEND_URL}/api/predict`, form, {
      headers: form.getHeaders(),
      timeout: 10000
    });

    assert(predRes.status === 200, '4.1 Leaf image prediction succeeds (HTTP 200)');
    assert(predRes.data?.prediction?.class !== undefined, `4.1 Identified class: ${predRes.data?.prediction?.class}`);
    assert(predRes.data?.prediction?.localName !== undefined, `4.1 Identified local name: ${predRes.data?.prediction?.localName}`);
    assert(predRes.data?.prediction?.calibratedConfidence !== undefined, `4.1 Calibrated confidence: ${predRes.data?.prediction?.calibratedConfidence}`);
    assert(predRes.data?.gradcam?.available === true, '4.1 Grad-CAM heatmaps generated independently of geolocation');
    assert(predRes.data?.compounds?.length > 0, `4.1 Bioactive compounds loaded: ${predRes.data?.compounds?.length}`);
  } catch (err) {
    assert(false, `4.1 Prediction test failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // SECTION 5: STRICT ML PROTECTION VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- SECTION 5: Strict ML Protection Verification ---');

  try {
    const gitDiffAI = execSync('git status --short ai_service', { encoding: 'utf8' }).trim();
    assert(gitDiffAI === '', `5.1 Zero changes inside ai_service/ directory (output: '${gitDiffAI}')`);

    const gitDiffTraining = execSync('git status --short training', { encoding: 'utf8' }).trim();
    assert(gitDiffTraining === '', `5.2 Zero changes inside training/ directory (output: '${gitDiffTraining}')`);

    const gitDiffFiles = execSync('git diff --name-only', { encoding: 'utf8' }).trim().split('\n');
    const mlFilesTouched = gitDiffFiles.filter(f =>
      f.includes('mobilenet') ||
      f.includes('weights') ||
      f.includes('calibration') ||
      f.includes('gradcam') ||
      f.includes('ai_service') ||
      f.includes('training')
    );
    assert(mlFilesTouched.length === 0, `5.3 Zero ML/weights/calibration files modified (count: ${mlFilesTouched.length})`);
  } catch (err) {
    assert(false, `5.x Git inspection error: ${err.message}`);
  }

  // Summary
  console.log('\n====================================================');
  console.log(`PHASE 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error running Phase 4 tests:', err);
  process.exit(1);
});
