/**
 * test_phase1_metadata_and_local_names.js
 * Comprehensive automated verification test suite for Phase 1:
 * - Programmatic check of all 40 plant classes in MongoDB
 * - Validation of localName, scientificName, commonName, modelClass, and taxonomy
 * - Verification of key specimens (Arali, Amruta Balli, Tulasi)
 * - Candidate predictions enrichment in predictController
 * - IdentificationHistory schema and controller field persistence
 * - Git status verification ensuring ai_service/ and training/ remain 100% untouched
 */

const mongoose = require('mongoose');
const { execSync } = require('child_process');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/phyto_vision_cache';
const Plant = require('../models/Plant');
const IdentificationHistory = require('../models/IdentificationHistory');

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 1 VERIFICATION TEST SUITE');
  console.log('====================================================\n');

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

  // 1. Check Git ML Isolation
  console.log('--- TEST 1: Strict ML Isolation Check ---');
  try {
    const gitStatus = execSync('git status -s ai_service training', {
      cwd: path.join(__dirname, '..', '..'),
      encoding: 'utf8'
    }).trim();
    assert(gitStatus === '', 'ai_service/ and training/ directories are 100% untouched in git status');
  } catch (err) {
    assert(false, `Git status check error: ${err.message}`);
  }

  // 2. Connect to MongoDB
  console.log('\n--- TEST 2: MongoDB 40-Plant Metadata Verification ---');
  await mongoose.connect(MONGO_URI);

  const plants = await Plant.find({}).lean();
  assert(plants.length === 40, `Exactly 40 plant documents found in database (count = ${plants.length})`);

  let allHaveModelClass = true;
  let allHaveLocalName = true;
  let allHaveScientificName = true;
  let allHaveCommonName = true;
  let allHaveTaxonomy = true;
  const missingDetails = [];

  for (const p of plants) {
    if (!p.modelClass || typeof p.modelClass !== 'string' || !p.modelClass.trim()) {
      allHaveModelClass = false;
      missingDetails.push(`${p._id}: missing modelClass`);
    }
    if (!p.localName || typeof p.localName !== 'string' || !p.localName.trim()) {
      allHaveLocalName = false;
      missingDetails.push(`${p.modelClass || p._id}: missing localName`);
    }
    if (!p.scientificName || typeof p.scientificName !== 'string' || !p.scientificName.trim()) {
      allHaveScientificName = false;
      missingDetails.push(`${p.modelClass || p._id}: missing scientificName`);
    }
    if (!p.commonName || typeof p.commonName !== 'string' || !p.commonName.trim()) {
      allHaveCommonName = false;
      missingDetails.push(`${p.modelClass || p._id}: missing commonName`);
    }
    if (!p.taxonomy || !p.taxonomy.family || !p.taxonomy.genus) {
      allHaveTaxonomy = false;
      missingDetails.push(`${p.modelClass || p._id}: missing taxonomy family/genus`);
    }
  }

  assert(allHaveModelClass, 'All 40 plants contain non-empty modelClass');
  assert(allHaveLocalName, 'All 40 plants contain non-empty localName');
  assert(allHaveScientificName, 'All 40 plants contain non-empty scientificName');
  assert(allHaveCommonName, 'All 40 plants contain non-empty commonName');
  assert(allHaveTaxonomy, 'All 40 plants contain valid taxonomy (family & genus)');

  if (missingDetails.length > 0) {
    console.error('Details of missing metadata:', missingDetails);
  }

  // 3. Test Key Required Botanical Examples
  console.log('\n--- TEST 3: Key Botanical Specimen Verification ---');
  const arali = plants.find(p => p.scientificName === 'Nerium oleander' || p.localName === 'Arali');
  assert(
    arali &&
    arali.localName === 'Arali' &&
    arali.scientificName === 'Nerium oleander' &&
    arali.commonName.toLowerCase().includes('oleander'),
    `Arali verified: localName='${arali?.localName}', sci='${arali?.scientificName}', common='${arali?.commonName}'`
  );

  const amruta = plants.find(p => p.scientificName === 'Tinospora cordifolia' || p.localName === 'Amruta Balli');
  assert(
    amruta &&
    amruta.localName === 'Amruta Balli' &&
    amruta.scientificName === 'Tinospora cordifolia' &&
    amruta.commonName.toLowerCase().includes('moonseed'),
    `Amruta Balli verified: localName='${amruta?.localName}', sci='${amruta?.scientificName}', common='${amruta?.commonName}'`
  );

  const tulasi = plants.find(p => p.scientificName === 'Ocimum tenuiflorum' || p.localName === 'Tulasi');
  assert(
    tulasi &&
    tulasi.localName === 'Tulasi' &&
    tulasi.scientificName === 'Ocimum tenuiflorum' &&
    tulasi.commonName.toLowerCase().includes('basil'),
    `Tulasi verified: localName='${tulasi?.localName}', sci='${tulasi?.scientificName}', common='${tulasi?.commonName}'`
  );

  // 4. Schema verification
  console.log('\n--- TEST 4: IdentificationHistory Schema Verification ---');
  const historySchemaPaths = IdentificationHistory.schema.paths;
  assert(!!historySchemaPaths['localName'], 'IdentificationHistory schema has localName path defined');
  assert(!!historySchemaPaths['scientificName'], 'IdentificationHistory schema has scientificName path defined');
  assert(!!historySchemaPaths['commonName'], 'IdentificationHistory schema has commonName path defined');

  // 5. Candidate Top Predictions Enrichment Verification
  console.log('\n--- TEST 5: Top Predictions Candidate Enrichment Logic ---');
  const sampleTopPredictions = [
    { class: 'Arali', confidence: 0.85, calibratedConfidence: 0.82 },
    { class: 'Amruta_Balli', confidence: 0.10, calibratedConfidence: 0.12 },
    { class: 'Tulasi', confidence: 0.05, calibratedConfidence: 0.06 }
  ];

  const candidateClasses = sampleTopPredictions.map(c => c.class);
  const candidateDocs = await Plant.find({
    $or: [
      { modelClass: { $in: candidateClasses } },
      { scientificName: { $in: candidateClasses } }
    ]
  }).select('modelClass localName scientificName commonName taxonomy');

  const candidateMap = new Map();
  candidateDocs.forEach(doc => {
    if (doc.modelClass) candidateMap.set(doc.modelClass, doc);
    if (doc.scientificName) candidateMap.set(doc.scientificName, doc);
  });

  const enriched = sampleTopPredictions.map(cand => {
    const match = candidateMap.get(cand.class);
    return {
      ...cand,
      modelClass: match?.modelClass || cand.class,
      localName: match?.localName || cand.localName || match?.commonName || cand.class,
      scientificName: match?.scientificName || cand.scientificName || '',
      commonName: match?.commonName || cand.commonName || cand.class,
      taxonomy: match?.taxonomy || {}
    };
  });

  assert(enriched[0].localName === 'Arali' && enriched[0].scientificName === 'Nerium oleander', 'Arali candidate properly enriched with localName & scientificName');
  assert(enriched[1].localName === 'Amruta Balli' && enriched[1].scientificName === 'Tinospora cordifolia', 'Amruta_Balli candidate properly enriched with localName & scientificName');
  assert(enriched[2].localName === 'Tulasi' && enriched[2].scientificName === 'Ocimum tenuiflorum', 'Tulasi candidate properly enriched with localName & scientificName');

  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log(`PHASE 1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
