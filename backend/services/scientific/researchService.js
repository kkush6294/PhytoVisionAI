const { getTaxonomy } = require('./gbifService');
const { searchCompounds } = require('./pubchemService');
const { searchMedicinalEvidence } = require('./europePmcService');
const { searchResearchPapers } = require('./crossrefService');
const { getSafetyInfo } = require('./safetyService');
const { getExtractionGuidance } = require('./extractionService');

async function getResearchData({
  className,
  commonName,
  scientificName
}) {
  const plantName =
    scientificName &&
    scientificName !== 'Unknown'
      ? scientificName
      : commonName &&
        commonName !== 'Unknown'
      ? commonName
      : className;

  if (!plantName || plantName === 'Unknown') {
    return {
      taxonomy: {},
      botanical: {},
      compounds: [],
      medicinalEvidence: [],
      extractionGuidance: { available: false, message: "Information unavailable from retrieved scientific sources." },
      safetyInfo: { available: false, message: "Information unavailable from retrieved scientific sources." },
      researchPapers: [],
      sources: []
    };
  }

  const [
    taxonomy,
    compounds,
    medicinalEvidence,
    researchPapers,
    extractionGuidance
  ] = await Promise.all([
    getTaxonomy(plantName).catch(err => {
      console.error('[GBIF Error]', err.message);
      return { available: false, source: 'GBIF', error: err.message };
    }),
    searchCompounds(plantName).catch(err => {
      console.error('[PubChem Error]', err.message);
      return { available: false, source: 'PubChem', compounds: [], error: err.message };
    }),
    searchMedicinalEvidence(plantName).catch(err => {
      console.error('[Europe PMC Error]', err.message);
      return { available: false, source: 'Europe PMC', results: [], error: err.message };
    }),
    searchResearchPapers(plantName).catch(err => {
      console.error('[Crossref Error]', err.message);
      return { available: false, source: 'Crossref', results: [], error: err.message };
    }),
    getExtractionGuidance(scientificName, className).catch(err => {
      console.error('[Extraction Service Error]', err.message);
      return { available: false, message: 'Extraction information retrieval failed: ' + err.message };
    })
  ]);

  const safetyInfo = getSafetyInfo(scientificName, className);

  return {
    taxonomy,

    botanical: {
      available: taxonomy?.available || false,
      source: taxonomy?.source || 'GBIF',
      scientificName:
        taxonomy?.retrievedName || plantName,
      rank: taxonomy?.rank || null,
      taxonomy: taxonomy?.taxonomy || {}
    },

    compounds:
      compounds?.compounds || [],

    medicinalEvidence:
      medicinalEvidence?.results || [],

    extractionGuidance,

    safetyInfo,

    researchPapers:
      researchPapers?.results || [],

    sources: [
      {
        name: 'GBIF Taxonomy',
        available: taxonomy?.available || false
      },
      {
        name: 'PubChem Chemical Records',
        available: compounds?.available || false
      },
      {
        name: 'Europe PMC Literature',
        available: medicinalEvidence?.available || false
      },
      {
        name: 'Crossref Publications',
        available: researchPapers?.available || false
      },
      {
        name: extractionGuidance?.source || 'Extraction Protocol Database',
        available: extractionGuidance?.available || false
      },
      {
        name: 'Pharmacological Monograph Database',
        available: safetyInfo?.available || false
      }
    ]
  };
}

module.exports = {
  getResearchData
};
