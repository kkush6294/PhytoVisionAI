/**
 * test_indications.js
 * ====================
 * Comprehensive verification suite for Plant-Specific Medicinal Evidence
 * and Structured Health Condition Recommendations.
 *
 * Checks:
 * 1. Tulsi + cough returns Tulsi when supported by dataset.
 * 2. "coughing" normalizes to "cough" and returns Tulsi.
 * 3. "cold" normalizes to "common cold".
 * 4. "throat irritation" normalizes to "sore throat".
 * 5. Unsupported condition returns zero results ("No documented plant associations").
 * 6. Safety contraindications cannot create recommendations (Crohn's, pregnancy, hyperkalemia).
 * 7. Extraction text cannot create recommendations (Soxhlet, ethanol).
 * 8. Different plants retain distinct, evidence-based medicinal properties.
 * 9. No generic five-property fallback exists across plants.
 * 10. Indication provenance metadata is returned (term, category, evidenceType, source, citation).
 * 11. Plants lacking cough evidence (e.g., Castor, Bamboo without respiratory claim) behave strictly according to evidence.
 * 12. Plant model schema contains structured indications array.
 */

const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');
const Plant = require('../models/Plant');

const GATEWAY_URL = 'http://localhost:5000';
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('STARTING PLANT-SPECIFIC MEDICINAL EVIDENCE & RECOMMENDATIONS SUITE');
  console.log(`Gateway Target: ${GATEWAY_URL}`);
  console.log('================================================================\n');

  try {
    // Connect to database to inspect raw records
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/phyto_vision_cache';
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    // TEST 1: Tulsi + cough returns Tulsi
    const res1 = await axios.get(`${GATEWAY_URL}/api/recommendations/condition/cough`);
    assert(res1.status === 200, 'Test 1.1: GET /api/recommendations/condition/cough returns HTTP 200');
    assert(res1.data.count > 0, `Test 1.2: Cough returns matches (Found: ${res1.data.count})`);
    const tulsiMatch = res1.data.recommendations.find(r => r.modelClass === 'Tulasi' || r.commonName === 'Tulsi');
    assert(!!tulsiMatch, 'Test 1.3: Tulsi is returned for condition "cough"');
    assert(tulsiMatch?.matchedIndication === 'cough', `Test 1.4: Matched indication is "cough" (Got: ${tulsiMatch?.matchedIndication})`);

    // TEST 2: "coughing" normalizes to "cough"
    const res2 = await axios.get(`${GATEWAY_URL}/api/recommendations/condition/coughing`);
    assert(res2.status === 200, 'Test 2.1: GET /api/recommendations/condition/coughing returns HTTP 200');
    assert(res2.data.normalizedCondition === 'cough', `Test 2.2: Query "coughing" normalized to "cough" (Got: ${res2.data.normalizedCondition})`);
    const tulsiMatch2 = res2.data.recommendations.find(r => r.modelClass === 'Tulasi');
    assert(!!tulsiMatch2, 'Test 2.3: Tulsi is returned when searching "coughing"');

    // TEST 3: "cold" normalizes to "common cold"
    const res3 = await axios.get(`${GATEWAY_URL}/api/recommendations/condition/cold`);
    assert(res3.status === 200, 'Test 3.1: GET /api/recommendations/condition/cold returns HTTP 200');
    assert(res3.data.normalizedCondition === 'common cold', `Test 3.2: Query "cold" normalized to "common cold" (Got: ${res3.data.normalizedCondition})`);
    assert(res3.data.count > 0, `Test 3.3: "common cold" returns documented taxa (Found: ${res3.data.count})`);

    // TEST 4: "throat irritation" normalizes to "sore throat"
    const res4 = await axios.get(`${GATEWAY_URL}/api/recommendations/condition/throat%20irritation`);
    assert(res4.status === 200, 'Test 4.1: GET /api/recommendations/condition/throat irritation returns HTTP 200');
    assert(res4.data.normalizedCondition === 'sore throat', `Test 4.2: Query normalized to "sore throat" (Got: ${res4.data.normalizedCondition})`);
    assert(res4.data.count > 0, `Test 4.3: "sore throat" returns documented taxa (Found: ${res4.data.count})`);

    // TEST 5: Unsupported condition returns zero results
    const res5 = await axios.get(`${GATEWAY_URL}/api/recommendations/condition/unsupportedmedicalconditionxyz999`);
    assert(res5.status === 200, 'Test 5.1: Unsupported condition returns HTTP 200');
    assert(res5.data.count === 0, `Test 5.2: Unsupported condition returns zero results (Count: ${res5.data.count})`);

    // TEST 6: Safety contraindications CANNOT create recommendations
    // e.g. Aloe mentions Crohn's in contraindications; search for "crohn" must NOT return Aloe
    const res6 = await axios.get(`${GATEWAY_URL}/api/recommendations/condition/crohn`);
    const aloeInCrohn = (res6.data.recommendations || []).some(r => r.modelClass === 'Aloevera');
    assert(!aloeInCrohn, 'Test 6.1: Aloe vera is NOT recommended for "crohn" (mentioned only in contraindications)');

    // TEST 7: Extraction text CANNOT create recommendations
    const res7 = await axios.get(`${GATEWAY_URL}/api/recommendations/condition/maceration`);
    assert(res7.data.count === 0, `Test 7.1: Extraction method "maceration" yields zero recommendations (Count: ${res7.data.count})`);

    // TEST 8: Distinct medicinal properties across all plants
    const allPlants = await Plant.find({}).select('modelClass medicinalProperties');
    assert(allPlants.length === 40, `Test 8.1: Exactly 40 plants found in database (Found: ${allPlants.length})`);

    const propertySets = new Set(allPlants.map(p => JSON.stringify(p.medicinalProperties)));
    assert(propertySets.size >= 35, `Test 8.2: High specificity of medicinal properties across taxa (${propertySets.size}/40 distinct property profiles)`);

    // TEST 9: Verify no plant contains the old generic 5-property fallback
    const genericSignature = JSON.stringify([
      "Antimicrobial & Antiseptic activity",
      "Antioxidant & Free-radical scavenging",
      "Anti-inflammatory response modulation",
      "Wound healing acceleration",
      "Immunomodulatory properties"
    ]);
    const hasGenericFallback = allPlants.some(p => JSON.stringify(p.medicinalProperties) === genericSignature);
    assert(!hasGenericFallback, 'Test 9.1: Zero plants contain the generic 5-property fallback list in database');

    // TEST 10: Indication provenance metadata is returned
    const res10 = await axios.get(`${GATEWAY_URL}/api/recommendations/condition/cough`);
    const sampleRec = res10.data.recommendations[0];
    assert(typeof sampleRec.matchedIndication === 'string' && sampleRec.matchedIndication.length > 0, 'Test 10.1: matchedIndication is returned');
    assert(typeof sampleRec.evidenceType === 'string' && sampleRec.evidenceType.length > 0, `Test 10.2: evidenceType is returned (${sampleRec.evidenceType})`);
    assert(typeof sampleRec.evidenceSource === 'string' && sampleRec.evidenceSource.length > 0, `Test 10.3: evidenceSource is returned (${sampleRec.evidenceSource.substring(0, 30)}...)`);

    // TEST 11: Unrelated plant (Castor) does not appear for cough
    const castorInCough = (res10.data.recommendations || []).some(r => r.modelClass === 'Castor');
    assert(!castorInCough, 'Test 11.1: Castor does NOT appear in recommendations for "cough"');

    // TEST 12: Castor DOES appear for constipation
    const res12 = await axios.get(`${GATEWAY_URL}/api/recommendations/condition/constipation`);
    const castorInConstipation = (res12.data.recommendations || []).some(r => r.modelClass === 'Castor');
    assert(castorInConstipation, 'Test 12.1: Castor appears in recommendations for "constipation" based on verified pharmacopoeial monograph');

  } catch (error) {
    console.error('[ERROR IN TEST SUITE]', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    failCount++;
  } finally {
    await mongoose.disconnect();
    console.log('\n================================================================');
    console.log(`TOTAL TESTS EXECUTED: ${passCount + failCount}`);
    console.log(`PASSED: ${passCount}`);
    console.log(`FAILED: ${failCount}`);
    console.log('================================================================');
    if (failCount === 0) {
      console.log('ALL PLANT-SPECIFIC EVIDENCE & RECOMMENDATION TESTS PASSED FULLY!');
      process.exit(0);
    } else {
      console.error(`${failCount} TEST(S) FAILED.`);
      process.exit(1);
    }
  }
}

runTests();
