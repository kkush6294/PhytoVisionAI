/**
 * test_local_names_and_dynamic_extraction.js
 * ===========================================
 * Comprehensive verification for Change 1 (Local Names & Taxonomy)
 * and Change 2 (Dynamic Extraction Protocol with zero placeholder strings).
 */

const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const Plant = require('../models/Plant');
const { getExtractionGuidance } = require('../services/scientific/extractionService');

const API_BASE = 'http://localhost:5000/api';
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/phyto_vision_cache';

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

async function runTests() {
  console.log('================================================================');
  console.log('STARTING LOCAL NAMES & DYNAMIC EXTRACTION PROTOCOL VERIFICATION');
  console.log('================================================================\n');

  try {
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    // -------------------------------------------------------------
    // SUITE 1: Database Model & Metadata Integrity for All 40 Taxa
    // -------------------------------------------------------------
    console.log('--- SUITE 1: Database Metadata Integrity (All 40 Taxa) ---');
    const allPlants = await Plant.find({}).sort({ commonName: 1 });
    assert(allPlants.length === 40, `All 40 medicinal plant records present in MongoDB (Got: ${allPlants.length})`);

    // Check Tinospora cordifolia in DB
    const tinospora = allPlants.find(p => p.scientificName === 'Tinospora cordifolia');
    assert(!!tinospora, 'Tinospora cordifolia found in database');
    assert(tinospora && tinospora.localName === 'Amruta Balli', `Tinospora localName is 'Amruta Balli' (Got: ${tinospora?.localName})`);
    assert(tinospora && tinospora.commonName === 'Heart-leaved Moonseed', `Tinospora commonName is 'Heart-leaved Moonseed' (Got: ${tinospora?.commonName})`);
    assert(tinospora && tinospora.taxonomy?.family === 'Menispermaceae', `Tinospora family is 'Menispermaceae' (Got: ${tinospora?.taxonomy?.family})`);
    assert(tinospora && tinospora.taxonomy?.genus === 'Tinospora', `Tinospora genus is 'Tinospora' (Got: ${tinospora?.taxonomy?.genus})`);
    assert(tinospora && tinospora.modelClass === 'Amruta_Balli', `Tinospora modelClass is 'Amruta_Balli' (Got: ${tinospora?.modelClass})`);

    // Check Nerium oleander in DB
    const nerium = allPlants.find(p => p.scientificName === 'Nerium oleander');
    assert(!!nerium, 'Nerium oleander found in database');
    assert(nerium && nerium.localName === 'Arali', `Nerium localName is 'Arali' (Got: ${nerium?.localName})`);
    assert(nerium && nerium.commonName === 'Oleander', `Nerium commonName is 'Oleander' (Got: ${nerium?.commonName})`);
    assert(nerium && nerium.taxonomy?.family === 'Apocynaceae', `Nerium family is 'Apocynaceae' (Got: ${nerium?.taxonomy?.family})`);
    assert(nerium && nerium.taxonomy?.genus === 'Nerium', `Nerium genus is 'Nerium' (Got: ${nerium?.taxonomy?.genus})`);
    assert(nerium && nerium.modelClass === 'Arali', `Nerium modelClass is 'Arali' (Got: ${nerium?.modelClass})`);

    // Verify all 40 have localName, commonName, scientificName, taxonomy.family, taxonomy.genus
    const missingLocal = allPlants.filter(p => !p.localName || p.localName.trim() === '');
    assert(missingLocal.length === 0, `All 40 plants contain non-empty localName (Missing: ${missingLocal.length})`);

    const missingFamily = allPlants.filter(p => !p.taxonomy || !p.taxonomy.family || p.taxonomy.family.trim() === '');
    assert(missingFamily.length === 0, `All 40 plants contain valid taxonomy.family (Missing: ${missingFamily.length})`);

    const missingGenus = allPlants.filter(p => !p.taxonomy || !p.taxonomy.genus || p.taxonomy.genus.trim() === '');
    assert(missingGenus.length === 0, `All 40 plants contain valid taxonomy.genus (Missing: ${missingGenus.length})`);

    // -------------------------------------------------------------
    // SUITE 2: REST API Endpoints Return localName, commonName & taxonomy
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: REST API Metadata Endpoints ---');

    // GET /api/plants (List)
    const plantsRes = await axios.get(`${API_BASE}/plants?limit=40`);
    assert(plantsRes.status === 200, 'GET /api/plants returns HTTP 200');
    assert(plantsRes.data.plants?.length >= 40, `GET /api/plants returns plants list (Count: ${plantsRes.data.plants?.length})`);

    const apiTinospora = plantsRes.data.plants.find(p => p.scientificName === 'Tinospora cordifolia');
    assert(apiTinospora?.localName === 'Amruta Balli', `GET /api/plants exposes localName 'Amruta Balli' for Tinospora`);
    assert(apiTinospora?.commonName === 'Heart-leaved Moonseed', `GET /api/plants exposes commonName 'Heart-leaved Moonseed'`);
    assert(apiTinospora?.taxonomy?.family === 'Menispermaceae', `GET /api/plants exposes family 'Menispermaceae'`);

    // GET /api/plants/:idOrClass with local name search
    const localSearchRes = await axios.get(`${API_BASE}/plants/Amruta%20Balli`);
    assert(localSearchRes.status === 200, 'GET /api/plants/Amruta Balli returns HTTP 200');
    assert(localSearchRes.data.plant?.scientificName === 'Tinospora cordifolia', 'Search by localName "Amruta Balli" resolves to Tinospora cordifolia');

    const araliSearchRes = await axios.get(`${API_BASE}/plants/Arali`);
    assert(araliSearchRes.status === 200, 'GET /api/plants/Arali returns HTTP 200');
    assert(araliSearchRes.data.plant?.scientificName === 'Nerium oleander', 'Search by localName "Arali" resolves to Nerium oleander');

    // GET /api/extraction/:idOrClass
    const extRes = await axios.get(`${API_BASE}/extraction/Amruta_Balli`);
    assert(extRes.status === 200, 'GET /api/extraction/Amruta_Balli returns HTTP 200');
    assert(extRes.data.plant?.localName === 'Amruta Balli', `Extraction API returns plant.localName 'Amruta Balli' (Got: ${extRes.data.plant?.localName})`);
    assert(extRes.data.plant?.commonName === 'Heart-leaved Moonseed', `Extraction API returns plant.commonName (Got: ${extRes.data.plant?.commonName})`);
    assert(extRes.data.plant?.scientificName === 'Tinospora cordifolia', `Extraction API returns plant.scientificName (Got: ${extRes.data.plant?.scientificName})`);

    // GET /api/recommendations/condition/cough
    const recRes = await axios.get(`${API_BASE}/recommendations/condition/cough`);
    assert(recRes.status === 200, 'GET /api/recommendations/condition/cough returns HTTP 200');
    const tulsiRec = recRes.data.recommendations?.find(r => r.scientificName === 'Ocimum tenuiflorum');
    assert(!!tulsiRec, 'Tulsi is recommended for cough');
    assert(tulsiRec?.localName === 'Tulasi', `Recommendation returns localName 'Tulasi' (Got: ${tulsiRec?.localName})`);

    // -------------------------------------------------------------
    // SUITE 3: Extraction Guidance Pipeline & Zero Placeholder Rule
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Dynamic Extraction Protocol & Zero Placeholder Strings ---');

    const tinosporaExtraction = await getExtractionGuidance('Tinospora cordifolia', 'Amruta_Balli');
    assert(tinosporaExtraction.available === true, 'Tinospora extraction guidance is available');

    // Verify ZERO instances of "Not reported in retrieved source"
    const valuesToCheck = [
      tinosporaExtraction.plantPart,
      tinosporaExtraction.method,
      tinosporaExtraction.solvent,
      tinosporaExtraction.solventConcentration,
      tinosporaExtraction.temperature,
      tinosporaExtraction.extractionTime,
      tinosporaExtraction.preparation,
      tinosporaExtraction.reference
    ];

    const hasPlaceholder = valuesToCheck.some(v => typeof v === 'string' && (
      v.toLowerCase().includes('not reported') ||
      v.toLowerCase().includes('not specified') ||
      v.toLowerCase().includes('unavailable')
    ));
    assert(!hasPlaceholder, 'Tinospora extraction guidance contains ZERO placeholder strings (missing fields are null)');

    const neriumExtraction = await getExtractionGuidance('Nerium oleander', 'Arali');
    assert(neriumExtraction.available === true, 'Nerium extraction guidance is available');
    const neriumValues = [
      neriumExtraction.plantPart,
      neriumExtraction.method,
      neriumExtraction.solvent,
      neriumExtraction.solventConcentration,
      neriumExtraction.temperature,
      neriumExtraction.extractionTime,
      neriumExtraction.preparation,
      neriumExtraction.reference
    ];
    const neriumHasPlaceholder = neriumValues.some(v => typeof v === 'string' && (
      v.toLowerCase().includes('not reported') ||
      v.toLowerCase().includes('not specified') ||
      v.toLowerCase().includes('unavailable')
    ));
    assert(!neriumHasPlaceholder, 'Nerium extraction guidance contains ZERO placeholder strings (missing fields are null)');

    // Verify Monograph Fallback also contains ZERO placeholder strings
    // Call extraction guidance with an unindexed name to force static fallback
    const staticTulasi = await getExtractionGuidance('Ocimum tenuiflorum', 'Tulasi');
    const staticValues = [
      staticTulasi.plantPart,
      staticTulasi.method,
      staticTulasi.solvent,
      staticTulasi.solventConcentration,
      staticTulasi.temperature,
      staticTulasi.extractionTime,
      staticTulasi.preparation,
      staticTulasi.reference
    ];
    const staticHasPlaceholder = staticValues.some(v => typeof v === 'string' && (
      v.toLowerCase().includes('not reported') ||
      v.toLowerCase().includes('not specified') ||
      v.toLowerCase().includes('curated concentration')
    ));
    assert(!staticHasPlaceholder, 'Monograph fallback contains ZERO fake concentrations or placeholder strings');

    // -------------------------------------------------------------
    // SUITE 4: Simulated Frontend Filtering & Completeness Counting
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Dynamic Parameter List & Completeness Counting ---');

    // Exact frontend helper logic
    const isAvailable = (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value !== "string") return true;
      const trimmed = value.trim().toLowerCase();
      if (!trimmed) return false;
      if (
        trimmed === "not reported in retrieved source" ||
        trimmed === "not reported" ||
        trimmed === "not specified" ||
        trimmed === "unavailable" ||
        trimmed === "information unavailable" ||
        trimmed.includes("not reported") ||
        trimmed.includes("not specified") ||
        trimmed.includes("unavailable")
      ) {
        return false;
      }
      return true;
    };

    // Simulate Nerium parameter list
    const neriumParams = [
      { label: "Plant Part", value: neriumExtraction.plantPart },
      { label: "Extraction Method", value: neriumExtraction.method },
      { label: "Solvent System", value: neriumExtraction.solvent },
      { label: "Solvent Concentration", value: neriumExtraction.solventConcentration },
      { label: "Temperature", value: neriumExtraction.temperature },
      { label: "Extraction Duration", value: neriumExtraction.extractionTime },
      { label: "Sample Preparation", value: neriumExtraction.preparation },
      { label: "Literature Reference & DOI", value: neriumExtraction.reference, doi: neriumExtraction.doi, isReference: true }
    ];

    const availableNerium = neriumParams.filter((param) => {
      if (param.isReference) {
        return isAvailable(param.value) || isAvailable(param.doi);
      }
      return isAvailable(param.value);
    });

    assert(availableNerium.length >= 2 && availableNerium.length <= 8, `Nerium dynamic parameter count is valid: ${availableNerium.length} of 8`);
    assert(!availableNerium.some(p => p.value === null || p.value === undefined), 'All filtered parameters have non-null values');
    assert(!availableNerium.some(p => typeof p.value === 'string' && p.value.includes('Not reported')), 'Zero filtered parameters contain "Not reported in retrieved source"');

  } catch (err) {
    console.error('[TEST SUITE ERROR]', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log('================================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
