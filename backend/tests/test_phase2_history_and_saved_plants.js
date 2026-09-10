/**
 * test_phase2_history_and_saved_plants.js
 * Comprehensive automated verification test suite for Phase 2:
 * - Identification History & Saved-Plant Naming Consistency
 * - Strict ML Protection Check (ai_service/ and training/ untouched)
 * - Naming hierarchy: PRIMARY localName, SECONDARY scientificName, SEPARATE commonName
 * - Canonical plant metadata as source of truth
 * - Real data verification for Arali, Amruta Balli, Tulasi, and remaining catalog taxa
 * - Legacy records without localName compatibility
 * - Authentication, ownership scoping, duplicate prevention
 */

const axios = require('axios');
const mongoose = require('mongoose');
const { execSync } = require('child_process');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/phyto_vision_cache';

const Plant = require('../models/Plant');
const IdentificationHistory = require('../models/IdentificationHistory');
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

async function runPhase2Tests() {
  console.log('================================================================');
  console.log('STARTING PHASE 2 AUTOMATED INTEGRATION & INTEGRITY SUITE');
  console.log('Backend Gateway:', BACKEND_URL);
  console.log('================================================================\n');

  // TEST 1: Strict ML Isolation Check
  console.log('--- TEST 1: Strict ML Protection Check ---');
  try {
    const gitStatus = execSync('git status -s ai_service training', {
      cwd: path.join(__dirname, '..', '..'),
      encoding: 'utf8'
    }).trim();
    assert(gitStatus === '', 'Zero Phase 2 changes inside ai_service/ and training/ (git status clean)');
  } catch (err) {
    assert(false, `Git isolation check failed: ${err.message}`);
  }

  // Connect directly to MongoDB for catalog and legacy records checks
  await mongoose.connect(MONGO_URI);

  // TEST 2: Canonical Plant Metadata as Source of Truth
  console.log('\n--- TEST 2: Canonical Catalog Metadata (All 40 Taxa) ---');
  const allPlants = await Plant.find({}).lean();
  assert(allPlants.length === 40, `All 40 canonical plant records present in MongoDB (count = ${allPlants.length})`);

  const araliDoc = allPlants.find(p => p.localName === 'Arali' || p.scientificName === 'Nerium oleander');
  const amrutaDoc = allPlants.find(p => p.localName === 'Amruta Balli' || p.scientificName === 'Tinospora cordifolia');
  const tulasiDoc = allPlants.find(p => p.localName === 'Tulasi' || p.scientificName === 'Ocimum tenuiflorum');

  assert(araliDoc && araliDoc.localName === 'Arali' && araliDoc.scientificName === 'Nerium oleander' && araliDoc.commonName === 'Oleander',
    `Arali: localName='${araliDoc?.localName}', sci='${araliDoc?.scientificName}', common='${araliDoc?.commonName}'`);
  assert(amrutaDoc && amrutaDoc.localName === 'Amruta Balli' && amrutaDoc.scientificName === 'Tinospora cordifolia' && amrutaDoc.commonName === 'Heart-leaved Moonseed',
    `Amruta Balli: localName='${amrutaDoc?.localName}', sci='${amrutaDoc?.scientificName}', common='${amrutaDoc?.commonName}'`);
  assert(tulasiDoc && tulasiDoc.localName === 'Tulasi' && tulasiDoc.scientificName === 'Ocimum tenuiflorum' && tulasiDoc.commonName === 'Holy Basil',
    `Tulasi: localName='${tulasiDoc?.localName}', sci='${tulasiDoc?.scientificName}', common='${tulasiDoc?.commonName}'`);

  // Verify all 40 have distinct localName, scientificName, commonName
  const allValidNames = allPlants.every(p => p.localName && p.scientificName && p.commonName && p.modelClass);
  assert(allValidNames, 'All 40 catalog records contain canonical localName, scientificName, commonName, and modelClass');

  // TEST 3: User Authentication & Registration for History & Saved Tests
  console.log('\n--- TEST 3: Authentication & Ownership Setup ---');
  const testEmailA = `phase2_user_a_${Date.now()}@domain.org`;
  const testEmailB = `phase2_user_b_${Date.now()}@domain.org`;

  const regResA = await axios.post(`${BACKEND_URL}/api/auth/register`, {
    name: 'Researcher Alice',
    email: testEmailA,
    password: 'Password123!'
  });
  const tokenA = regResA.data.token;
  const userAId = regResA.data.user?.id || regResA.data.user?._id;
  assert(regResA.status === 201 && !!tokenA, 'Registered User A for Phase 2 tests');

  const regResB = await axios.post(`${BACKEND_URL}/api/auth/register`, {
    name: 'Researcher Bob',
    email: testEmailB,
    password: 'Password123!'
  });
  const tokenB = regResB.data.token;
  assert(regResB.status === 201 && !!tokenB, 'Registered User B for scoping/ownership tests');

  const authHeadersA = { headers: { Authorization: `Bearer ${tokenA}` } };
  const authHeadersB = { headers: { Authorization: `Bearer ${tokenB}` } };

  // TEST 4: Identification History API - New Records & Field Retrieval
  console.log('\n--- TEST 4: Identification History API (New Records & Hierarchy) ---');
  const newHistRes = await axios.post(`${BACKEND_URL}/api/history`, {
    plantId: araliDoc._id.toString(),
    scientificName: araliDoc.scientificName,
    commonName: araliDoc.commonName,
    localName: araliDoc.localName,
    modelClass: araliDoc.modelClass,
    confidence: 0.9421,
    notes: 'Phase 2 automated specimen test for Arali'
  }, authHeadersA);

  assert(newHistRes.status === 201, 'POST /api/history returns HTTP 201');
  const createdHistory = newHistRes.data.history;
  assert(createdHistory.localName === 'Arali', `New history record contains localName (Got: '${createdHistory.localName}')`);
  assert(createdHistory.scientificName === 'Nerium oleander', `New history record contains scientificName (Got: '${createdHistory.scientificName}')`);
  assert(createdHistory.commonName === 'Oleander', `New history record contains commonName separately (Got: '${createdHistory.commonName}')`);
  assert(createdHistory.modelClass === 'Arali', `New history record contains modelClass (Got: '${createdHistory.modelClass}')`);
  assert(createdHistory.confidence === 0.9421, `New history record preserves confidence (Got: ${createdHistory.confidence})`);

  // History list retrieval
  const listHistRes = await axios.get(`${BACKEND_URL}/api/history`, authHeadersA);
  assert(listHistRes.status === 200, 'GET /api/history returns HTTP 200');
  const historyItem = listHistRes.data.history.find(h => h._id === createdHistory._id);
  assert(!!historyItem, 'Created history item returned in GET /api/history');
  assert(historyItem.localName === 'Arali', `History list exposes localName (Got: '${historyItem.localName}')`);
  assert(historyItem.scientificName === 'Nerium oleander', `History list exposes scientificName (Got: '${historyItem.scientificName}')`);
  assert(historyItem.commonName === 'Oleander', `History list exposes commonName separately (Got: '${historyItem.commonName}')`);
  assert(historyItem.plantId?.taxonomy?.family === 'Apocynaceae', `History item preserves populated taxonomy (family: '${historyItem.plantId?.taxonomy?.family}')`);

  // Record Amruta Balli and Tulasi in history
  const amrutaHistRes = await axios.post(`${BACKEND_URL}/api/history`, {
    scientificName: 'Tinospora cordifolia',
    confidence: 0.8872
  }, authHeadersA);
  assert(amrutaHistRes.data.history.localName === 'Amruta Balli', 'History record for Tinospora cordifolia automatically resolves localName to Amruta Balli');

  const tulasiHistRes = await axios.post(`${BACKEND_URL}/api/history`, {
    scientificName: 'Ocimum tenuiflorum',
    confidence: 0.9654
  }, authHeadersA);
  assert(tulasiHistRes.data.history.localName === 'Tulasi', 'History record for Ocimum tenuiflorum automatically resolves localName to Tulasi');

  // TEST 5: Legacy History Records Without localName
  console.log('\n--- TEST 5: Backward Compatibility for Legacy History Records ---');
  // Create a raw legacy record directly in MongoDB without localName, modelClass, or taxonomy
  const legacyRecord = await IdentificationHistory.create({
    userId: userAId,
    plantId: amrutaDoc._id,
    scientificName: amrutaDoc.scientificName,
    commonName: amrutaDoc.commonName,
    confidence: 0.7712,
    rejected: false,
    uploadedAt: new Date(Date.now() - 3600000)
  });

  const legacyListRes = await axios.get(`${BACKEND_URL}/api/history`, authHeadersA);
  const fetchedLegacy = legacyListRes.data.history.find(h => h._id.toString() === legacyRecord._id.toString());
  assert(!!fetchedLegacy, 'Legacy history record retrieved without crashing');
  assert(fetchedLegacy.localName === 'Amruta Balli', `Legacy record safely receives canonical localName from plantId fallback (Got: '${fetchedLegacy.localName}')`);
  assert(fetchedLegacy.scientificName === 'Tinospora cordifolia', `Legacy record maintains scientificName (Got: '${fetchedLegacy.scientificName}')`);
  assert(fetchedLegacy.commonName === 'Heart-leaved Moonseed', `Legacy record maintains commonName separately (Got: '${fetchedLegacy.commonName}')`);

  // TEST 6: Saved Plants API - Save, List, and Retrieval Hierarchy
  console.log('\n--- TEST 6: Saved Plants API & Naming Hierarchy ---');
  // Save Arali
  const saveAraliRes = await axios.post(`${BACKEND_URL}/api/saved-plants`, {
    plantId: araliDoc._id.toString()
  }, authHeadersA);
  assert(saveAraliRes.status === 201, 'POST /api/saved-plants (Arali) returns HTTP 201');
  const savedArali = saveAraliRes.data.savedPlant;
  assert(savedArali.plant.localName === 'Arali', `Saved plant response exposes localName: '${savedArali.plant.localName}'`);
  assert(savedArali.plant.scientificName === 'Nerium oleander', `Saved plant response exposes scientificName: '${savedArali.plant.scientificName}'`);
  assert(savedArali.plant.commonName === 'Oleander', `Saved plant response exposes commonName separately: '${savedArali.plant.commonName}'`);
  assert(savedArali.plant.modelClass === 'Arali', `Saved plant response exposes modelClass: '${savedArali.plant.modelClass}'`);
  assert(savedArali.plant.taxonomy?.family === 'Apocynaceae', `Saved plant response exposes taxonomy: '${savedArali.plant.taxonomy?.family}'`);

  // Save Amruta Balli and Tulasi
  await axios.post(`${BACKEND_URL}/api/saved-plants`, { plantId: amrutaDoc._id.toString() }, authHeadersA);
  await axios.post(`${BACKEND_URL}/api/saved-plants`, { plantId: tulasiDoc._id.toString() }, authHeadersA);

  // List saved plants
  const listSavedRes = await axios.get(`${BACKEND_URL}/api/saved-plants`, authHeadersA);
  assert(listSavedRes.status === 200 && listSavedRes.data.count === 3, `GET /api/saved-plants returns all 3 saved plants (Count: ${listSavedRes.data.count})`);

  const savedListArali = listSavedRes.data.savedPlants.find(s => s.plant.scientificName === 'Nerium oleander');
  const savedListAmruta = listSavedRes.data.savedPlants.find(s => s.plant.scientificName === 'Tinospora cordifolia');
  const savedListTulasi = listSavedRes.data.savedPlants.find(s => s.plant.scientificName === 'Ocimum tenuiflorum');

  assert(savedListArali?.plant?.localName === 'Arali' && savedListArali?.plant?.commonName === 'Oleander',
    'Saved plants list exposes Arali localName and commonName');
  assert(savedListAmruta?.plant?.localName === 'Amruta Balli' && savedListAmruta?.plant?.commonName === 'Heart-leaved Moonseed',
    'Saved plants list exposes Amruta Balli localName and commonName');
  assert(savedListTulasi?.plant?.localName === 'Tulasi' && savedListTulasi?.plant?.commonName === 'Holy Basil',
    'Saved plants list exposes Tulasi localName and commonName');

  // Single saved plant retrieval
  const singleSavedRes = await axios.get(`${BACKEND_URL}/api/saved-plants/${araliDoc._id.toString()}`, authHeadersA);
  assert(singleSavedRes.status === 200, 'GET /api/saved-plants/:plantId returns HTTP 200');
  assert(singleSavedRes.data.savedPlant.plant.localName === 'Arali', 'Single saved plant retrieval exposes localName');

  // TEST 7: Duplicate Prevention & Ownership Scoping
  console.log('\n--- TEST 7: Duplicate Prevention & Ownership Scoping ---');
  // Duplicate save should yield 409
  try {
    await axios.post(`${BACKEND_URL}/api/saved-plants`, { plantId: araliDoc._id.toString() }, authHeadersA);
    assert(false, 'Duplicate save should have thrown 409 Conflict');
  } catch (err) {
    assert(err.response?.status === 409, 'Duplicate save prevention returns HTTP 409 Conflict');
  }

  // User B cannot see User A's saved plants
  const listSavedResB = await axios.get(`${BACKEND_URL}/api/saved-plants`, authHeadersB);
  assert(listSavedResB.data.count === 0, 'User B has 0 saved plants (strict ownership scoping verified)');

  // User B cannot access User A's history record
  try {
    await axios.get(`${BACKEND_URL}/api/history/${createdHistory._id}`, authHeadersB);
    assert(false, 'Cross-user history access should have been rejected');
  } catch (err) {
    assert(err.response?.status === 404, 'Cross-user history access returns 404/unauthorized');
  }

  // Clean up test data
  await IdentificationHistory.deleteMany({ userId: { $in: [userAId, regResB.data.user?.id || regResB.data.user?._id] } });
  await SavedPlant.deleteMany({ userId: { $in: [userAId, regResB.data.user?.id || regResB.data.user?._id] } });
  await User.deleteMany({ _id: { $in: [userAId, regResB.data.user?.id || regResB.data.user?._id] } });

  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log(`PHASE 2 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase2Tests().catch(err => {
  console.error('Fatal error during Phase 2 testing:', err.message);
  process.exit(1);
});
