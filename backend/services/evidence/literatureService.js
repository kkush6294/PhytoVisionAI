const { searchMedicinalEvidence } = require('../scientific/europePmcService');
const { searchResearchPapers } = require('../scientific/crossrefService');
const { normalizeEuropePmc, normalizeCrossref } = require('./evidenceNormalizer');

/**
 * Literature Retrieval Service (PhytoVisionAI)
 *
 * Integrates scholarly metadata from Europe PMC and Crossref.
 * Enforces zero fabrication of citations, authors, journals, DOIs, or dates.
 */

const litCache = new Map();
const LIT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getScholarlyLiterature(scientificName) {
  if (!scientificName || typeof scientificName !== 'string' || scientificName.trim() === '' || scientificName === 'Unknown') {
    return {
      available: false,
      sources: ['Europe PMC', 'Crossref'],
      totalFound: 0,
      evidenceItems: [],
      message: 'Valid botanical scientific name required for scholarly literature retrieval.'
    };
  }

  const cleanName = scientificName.trim();
  const cacheKey = cleanName.toLowerCase();
  const cached = litCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < LIT_CACHE_TTL_MS)) {
    return cached.data;
  }

  const evidenceItems = [];

  // Query Europe PMC and Crossref concurrently with isolated error boundaries
  const [pmcRes, crossrefRes] = await Promise.all([
    searchMedicinalEvidence(cleanName).catch(err => {
      console.error('[Literature Service] Europe PMC error:', err.message);
      return { available: false, results: [] };
    }),
    searchResearchPapers(cleanName).catch(err => {
      console.error('[Literature Service] Crossref error:', err.message);
      return { available: false, results: [] };
    })
  ]);

  if (pmcRes && Array.isArray(pmcRes.results)) {
    for (const item of pmcRes.results) {
      const normalized = normalizeEuropePmc(item);
      if (normalized) evidenceItems.push(normalized);
    }
  }

  if (crossrefRes && Array.isArray(crossrefRes.results)) {
    for (const item of crossrefRes.results) {
      // Avoid duplicate DOIs already captured by PMC
      if (item.doi && evidenceItems.some(e => e.doi && e.doi.toLowerCase() === item.doi.toLowerCase())) {
        continue;
      }
      const normalized = normalizeCrossref(item);
      if (normalized) evidenceItems.push(normalized);
    }
  }

  const result = {
    available: evidenceItems.length > 0,
    sources: ['Europe PMC', 'Crossref'],
    totalFound: evidenceItems.length,
    evidenceItems,
    message: evidenceItems.length > 0
      ? `Retrieved ${evidenceItems.length} scholarly literature records.`
      : 'No scientific literature records found for this plant.'
  };

  litCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

function clearLiteratureCache() {
  litCache.clear();
}

module.exports = {
  getScholarlyLiterature,
  clearLiteratureCache,
  LIT_CACHE_TTL_MS
};
