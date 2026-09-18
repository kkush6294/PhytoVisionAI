const Plant = require('../../models/Plant');
const { getScholarlyLiterature } = require('./literatureService');
const { searchCompounds } = require('../scientific/pubchemService');
const { getExtractionGuidance } = require('../scientific/extractionService');
const { getSafetyInfo } = require('../scientific/safetyService');
const {
  normalizePubChem,
  normalizeMonographIndication,
  normalizeExtraction,
  normalizeSafety
} = require('./evidenceNormalizer');

/**
 * Unified Evidence Retrieval Service (PhytoVisionAI)
 *
 * Orchestrates multi-source evidence aggregation for identified medicinal plants.
 * Strictly separates factual evidence categories and prevents unverified claims.
 */

const evidenceCache = new Map();
const EVIDENCE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getPlantEvidence({ plantId, modelClass, scientificName, localName }) {
  // 1. Resolve canonical Plant from DB
  let plantDoc = null;
  if (plantId) {
    try {
      plantDoc = await Plant.findById(plantId);
    } catch {
      // invalid id, fallback
    }
  }

  if (!plantDoc && modelClass) {
    plantDoc = await Plant.findOne({ modelClass });
  }

  if (!plantDoc && scientificName) {
    const escapedSci = (scientificName || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    plantDoc = await Plant.findOne({ scientificName: new RegExp(`^${escapedSci}$`, 'i') });
  }

  const resolvedSciName = plantDoc?.scientificName || scientificName || 'Unknown';
  const resolvedModelClass = plantDoc?.modelClass || modelClass || 'Unknown';
  const resolvedLocalName = plantDoc?.localName || localName || resolvedModelClass;
  const resolvedCommonName = plantDoc?.commonName || 'Unknown';

  const cacheKey = `${resolvedModelClass}:${resolvedSciName}`.toLowerCase();
  const cached = evidenceCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < EVIDENCE_CACHE_TTL_MS)) {
    return cached.data;
  }

  const evidenceItems = [];

  // 2. Fetch literature, compounds, extraction, and safety concurrently
  const [litRes, pubchemRes, extractionRes] = await Promise.all([
    getScholarlyLiterature(resolvedSciName).catch(() => ({ available: false, evidenceItems: [] })),
    searchCompounds(resolvedSciName !== 'Unknown' ? resolvedSciName : resolvedModelClass).catch(() => ({ available: false, compounds: [] })),
    getExtractionGuidance(resolvedSciName, resolvedModelClass).catch(() => ({ available: false }))
  ]);

  const safetyRes = getSafetyInfo(resolvedSciName, resolvedModelClass);

  // A. Literature evidence items
  if (litRes && Array.isArray(litRes.evidenceItems)) {
    evidenceItems.push(...litRes.evidenceItems);
  }

  // B. PubChem compound items (strictly tagged as reported chemical records)
  if (pubchemRes && Array.isArray(pubchemRes.compounds)) {
    for (const c of pubchemRes.compounds) {
      const item = normalizePubChem(c, resolvedLocalName || resolvedSciName);
      if (item) evidenceItems.push(item);
    }
  }

  // C. Monograph Indication items from database
  if (plantDoc && Array.isArray(plantDoc.indications)) {
    for (const ind of plantDoc.indications) {
      const item = normalizeMonographIndication(ind, resolvedLocalName || resolvedSciName);
      if (item) evidenceItems.push(item);
    }
  }

  // D. Extraction protocol items
  if (extractionRes && extractionRes.available) {
    const item = normalizeExtraction(extractionRes, resolvedLocalName || resolvedSciName);
    if (item) evidenceItems.push(item);
  }

  // E. Safety monograph items
  if (safetyRes && safetyRes.available) {
    const item = normalizeSafety(safetyRes, resolvedLocalName || resolvedSciName);
    if (item) evidenceItems.push(item);
  }

  // Aggregate stats by category and level
  const byCategory = {};
  const byLevel = {};
  for (const item of evidenceItems) {
    byCategory[item.evidenceCategory] = (byCategory[item.evidenceCategory] || 0) + 1;
    byLevel[item.evidenceLevel] = (byLevel[item.evidenceLevel] || 0) + 1;
  }

  const result = {
    success: true,
    plant: {
      id: plantDoc?._id || null,
      modelClass: resolvedModelClass,
      localName: resolvedLocalName,
      scientificName: resolvedSciName,
      commonName: resolvedCommonName,
      family: plantDoc?.taxonomy?.family || null,
      genus: plantDoc?.taxonomy?.genus || null
    },
    summary: {
      totalEvidenceCount: evidenceItems.length,
      byCategory,
      byLevel
    },
    evidenceItems,
    retrievedAt: new Date().toISOString()
  };

  evidenceCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

function clearEvidenceCache() {
  evidenceCache.clear();
}

module.exports = {
  getPlantEvidence,
  clearEvidenceCache,
  EVIDENCE_CACHE_TTL_MS
};
