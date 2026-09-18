/**
 * Evidence Normalization Layer (PhytoVisionAI)
 *
 * Standardizes evidence items from diverse sources into a unified structure
 * preserving exact provenance, evidence category, descriptive evidence level,
 * and verification status.
 *
 * CRITICAL SCIENTIFIC RULES:
 * 1. NEVER fabricate authors, titles, DOIs, years, or abstracts.
 * 2. NEVER label unverified application metadata as "verified".
 * 3. NEVER upgrade in vitro or animal studies into clinical claims.
 * 4. Maintain explicit distinction:
 *    A. Application metadata
 *    B. Source metadata
 *    C. Source-supported evidence
 *    D. LLM-generated summary
 */

const EVIDENCE_CATEGORIES = {
  TRADITIONAL_USE: 'traditional_use',
  PHARMACOLOGICAL: 'pharmacological',
  CLINICAL: 'clinical',
  CHEMICAL: 'chemical',
  TAXONOMY: 'taxonomy',
  SAFETY: 'safety',
  EXTRACTION: 'extraction',
  REFERENCE: 'reference'
};

const EVIDENCE_LEVELS = {
  TRADITIONAL: 'Traditional / ethnobotanical evidence',
  PRECLINICAL: 'Preclinical / animal evidence',
  IN_VITRO: 'In-vitro evidence',
  HUMAN_OBSERVATIONAL: 'Human observational evidence',
  CLINICAL: 'Clinical evidence',
  CHEMICAL: 'Chemical identification evidence',
  REFERENCE: 'Reference metadata',
  NOT_ESTABLISHED: 'Evidence type not established'
};

const VERIFICATION_STATUS = {
  SOURCE_SUPPORTED: 'source_supported',
  APPLICATION_METADATA: 'application_metadata',
  UNVERIFIED: 'unverified'
};

/**
 * Classifies the evidence level based on the claim or study abstract.
 * Avoids arbitrary pseudo-clinical scores.
 */
function classifyEvidenceLevel(text, fallback = EVIDENCE_LEVELS.NOT_ESTABLISHED) {
  if (!text || typeof text !== 'string') return fallback;
  const lower = text.toLowerCase();

  if (/\b(clinical trial|randomized controlled|double-blind|human trial|patients|clinical study|phase i|phase ii|phase iii)\b/.test(lower)) {
    return EVIDENCE_LEVELS.CLINICAL;
  }
  if (/\b(human observational|cohort study|cross-sectional|case-control|epidemiological)\b/.test(lower)) {
    return EVIDENCE_LEVELS.HUMAN_OBSERVATIONAL;
  }
  if (/\b(in vivo|rats|mice|murine|wistar|rabbit|rodent|animal model)\b/.test(lower)) {
    return EVIDENCE_LEVELS.PRECLINICAL;
  }
  if (/\b(in vitro|cell line|mcf-7|hela|microplate|enzymatic assay|dpph|free radical|cell culture|in-vitro)\b/.test(lower)) {
    return EVIDENCE_LEVELS.IN_VITRO;
  }
  if (/\b(traditional|ayurvedic|folk medicine|ethnobotanical|indigenous use|ayurveda|unani|siddha)\b/.test(lower)) {
    return EVIDENCE_LEVELS.TRADITIONAL;
  }
  if (/\b(chemical structure|molecular formula|pubchem|hplc|gc-ms|spectrometry|chromatography|cid)\b/.test(lower)) {
    return EVIDENCE_LEVELS.CHEMICAL;
  }
  if (/\b(taxonomy|gbif|herbarium|botanical classification|family|genus)\b/.test(lower)) {
    return EVIDENCE_LEVELS.REFERENCE;
  }

  return fallback;
}

/**
 * Normalizes an evidence item into canonical structure.
 */
function createEvidenceItem({
  sourceType,
  sourceName,
  title = null,
  authors = null,
  year = null,
  doi = null,
  url = null,
  claim,
  evidenceCategory = EVIDENCE_CATEGORIES.REFERENCE,
  evidenceLevel = EVIDENCE_LEVELS.NOT_ESTABLISHED,
  verificationStatus = VERIFICATION_STATUS.SOURCE_SUPPORTED,
  retrievedAt = new Date().toISOString()
}) {
  return {
    sourceType: sourceType || 'unknown',
    sourceName: sourceName || 'Unknown Source',
    title: title ? String(title).trim() : null,
    authors: authors ? String(authors).trim() : null,
    year: (typeof year === 'number' && !isNaN(year) && year > 1800 && year <= 2100) ? year : null,
    doi: doi ? String(doi).trim() : null,
    url: url ? String(url).trim() : null,
    claim: String(claim || '').trim(),
    evidenceCategory: Object.values(EVIDENCE_CATEGORIES).includes(evidenceCategory)
      ? evidenceCategory
      : EVIDENCE_CATEGORIES.REFERENCE,
    evidenceLevel: Object.values(EVIDENCE_LEVELS).includes(evidenceLevel)
      ? evidenceLevel
      : EVIDENCE_LEVELS.NOT_ESTABLISHED,
    verificationStatus: Object.values(VERIFICATION_STATUS).includes(verificationStatus)
      ? verificationStatus
      : VERIFICATION_STATUS.UNVERIFIED,
    retrievedAt
  };
}

/**
 * Normalizes Europe PMC article results.
 */
function normalizeEuropePmc(article) {
  if (!article) return null;
  const abstract = article.abstract || article.abstractText || '';
  const level = classifyEvidenceLevel(abstract + ' ' + (article.title || ''));
  const category = level === EVIDENCE_LEVELS.CLINICAL
    ? EVIDENCE_CATEGORIES.CLINICAL
    : (level === EVIDENCE_LEVELS.PRECLINICAL || level === EVIDENCE_LEVELS.IN_VITRO
      ? EVIDENCE_CATEGORIES.PHARMACOLOGICAL
      : EVIDENCE_CATEGORIES.REFERENCE);

  let year = null;
  if (article.publicationDate) {
    const y = parseInt(String(article.publicationDate).slice(0, 4), 10);
    if (!isNaN(y) && y > 1800) year = y;
  }

  const doi = article.doi ? article.doi.trim() : null;
  const url = doi ? `https://doi.org/${doi}` : (article.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` : null);

  return createEvidenceItem({
    sourceType: 'europe_pmc',
    sourceName: 'Europe PMC',
    title: article.title || null,
    authors: article.authors || article.authorString || null,
    year,
    doi,
    url,
    claim: abstract ? abstract.slice(0, 350) + (abstract.length > 350 ? '...' : '') : (article.title || 'Scholarly publication retrieved from Europe PMC.'),
    evidenceCategory: category,
    evidenceLevel: level,
    verificationStatus: doi || article.pmid ? VERIFICATION_STATUS.SOURCE_SUPPORTED : VERIFICATION_STATUS.UNVERIFIED
  });
}

/**
 * Normalizes Crossref works results.
 */
function normalizeCrossref(item) {
  if (!item) return null;
  let year = null;
  if (Array.isArray(item.published) && item.published.length > 0) {
    const y = parseInt(item.published[0], 10);
    if (!isNaN(y) && y > 1800) year = y;
  }

  let authors = null;
  if (Array.isArray(item.authors)) {
    authors = item.authors.map(a => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean).join(', ') || null;
  } else if (typeof item.authors === 'string') {
    authors = item.authors;
  }

  const doi = item.doi ? item.doi.trim() : null;
  const url = doi ? `https://doi.org/${doi}` : null;
  const title = item.title || null;
  const level = classifyEvidenceLevel(title || '');

  return createEvidenceItem({
    sourceType: 'crossref',
    sourceName: 'Crossref',
    title,
    authors,
    year,
    doi,
    url,
    claim: title ? `Published work in ${item.journal || 'scholarly literature'}: "${title}"` : 'Scholarly record in Crossref.',
    evidenceCategory: EVIDENCE_CATEGORIES.REFERENCE,
    evidenceLevel: level,
    verificationStatus: doi ? VERIFICATION_STATUS.SOURCE_SUPPORTED : VERIFICATION_STATUS.UNVERIFIED
  });
}

/**
 * Normalizes PubChem compound record.
 * RULE: Chemical metadata alone does NOT prove in-plant presence.
 */
function normalizePubChem(compound, plantName) {
  if (!compound || !compound.name) return null;
  const cid = compound.cid || null;
  const url = cid ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}` : null;

  const desc = [
    compound.formula ? `Formula: ${compound.formula}` : null,
    compound.molecularWeight ? `MW: ${compound.molecularWeight} g/mol` : null
  ].filter(Boolean).join(', ');

  const claim = desc
    ? `Compound associated with ${plantName || 'the plant'} in retrieved literature (${desc}). Chemical properties verified via PubChem.`
    : `Compound associated with ${plantName || 'the plant'} in retrieved literature. Chemical record indexed by PubChem.`;

  return createEvidenceItem({
    sourceType: 'pubchem',
    sourceName: 'PubChem PUG-REST',
    title: `${compound.name} (CID ${cid || 'N/A'})`,
    authors: 'National Center for Biotechnology Information (NCBI)',
    year: null,
    doi: null,
    url,
    claim,
    evidenceCategory: EVIDENCE_CATEGORIES.CHEMICAL,
    evidenceLevel: EVIDENCE_LEVELS.CHEMICAL,
    verificationStatus: cid ? VERIFICATION_STATUS.SOURCE_SUPPORTED : VERIFICATION_STATUS.APPLICATION_METADATA
  });
}

/**
 * Normalizes botanical monograph indications.
 */
function normalizeMonographIndication(ind, plantName) {
  if (!ind || !ind.term) return null;
  const level = ind.evidenceType === 'clinical'
    ? EVIDENCE_LEVELS.CLINICAL
    : (ind.evidenceType === 'preclinical'
      ? EVIDENCE_LEVELS.PRECLINICAL
      : EVIDENCE_LEVELS.TRADITIONAL);

  const category = level === EVIDENCE_LEVELS.CLINICAL
    ? EVIDENCE_CATEGORIES.CLINICAL
    : (level === EVIDENCE_LEVELS.PRECLINICAL
      ? EVIDENCE_CATEGORIES.PHARMACOLOGICAL
      : EVIDENCE_CATEGORIES.TRADITIONAL_USE);

  return createEvidenceItem({
    sourceType: 'monograph',
    sourceName: ind.source || 'Pharmacological Botanical Monograph',
    title: `${plantName || 'Plant'} indication: ${ind.term}`,
    authors: null,
    year: null,
    doi: null,
    url: ind.url || null,
    claim: ind.citation || `Reported traditional/medicinal use for ${ind.term}.`,
    evidenceCategory: category,
    evidenceLevel: level,
    verificationStatus: ind.citation ? VERIFICATION_STATUS.SOURCE_SUPPORTED : VERIFICATION_STATUS.APPLICATION_METADATA
  });
}

/**
 * Normalizes extraction protocol data.
 */
function normalizeExtraction(extraction, plantName) {
  if (!extraction || !extraction.available) return null;
  const p = extraction.protocol || {};
  const claimParts = [];
  if (p.plantPart) claimParts.push(`Part: ${p.plantPart}`);
  if (p.extractionMethod) claimParts.push(`Method: ${p.extractionMethod}`);
  if (p.solventSystem) claimParts.push(`Solvent: ${p.solventSystem}`);
  if (p.solventConcentration) claimParts.push(`Concentration: ${p.solventConcentration}`);
  if (p.temperature) claimParts.push(`Temp: ${p.temperature}`);
  if (p.extractionDuration) claimParts.push(`Duration: ${p.extractionDuration}`);

  return createEvidenceItem({
    sourceType: 'extraction',
    sourceName: extraction.source || 'Standard Laboratory Extraction Monograph',
    title: `Extraction protocol for ${plantName || 'plant'}`,
    authors: null,
    year: null,
    doi: p.doi || null,
    url: p.doi ? `https://doi.org/${p.doi}` : null,
    claim: claimParts.length > 0 ? claimParts.join('; ') : 'Laboratory extraction parameters documented in monograph.',
    evidenceCategory: EVIDENCE_CATEGORIES.EXTRACTION,
    evidenceLevel: EVIDENCE_LEVELS.IN_VITRO,
    verificationStatus: p.doi ? VERIFICATION_STATUS.SOURCE_SUPPORTED : VERIFICATION_STATUS.APPLICATION_METADATA
  });
}

/**
 * Normalizes safety monograph data.
 */
function normalizeSafety(safety, plantName) {
  if (!safety || !safety.available) return null;
  const parts = [];
  if (safety.toxicityLevel) parts.push(`Toxicity: ${safety.toxicityLevel}`);
  if (Array.isArray(safety.precautions) && safety.precautions.length > 0) {
    parts.push(`Precautions: ${safety.precautions.join(', ')}`);
  }
  if (safety.safetyNotes) parts.push(safety.safetyNotes);

  return createEvidenceItem({
    sourceType: 'monograph',
    sourceName: safety.source || 'Herbal Safety Monograph',
    title: `Safety evaluation for ${plantName || 'plant'}`,
    authors: null,
    year: null,
    doi: null,
    url: null,
    claim: parts.join('; ') || 'Safety and contraindication profile documented in botanical reference monographs.',
    evidenceCategory: EVIDENCE_CATEGORIES.SAFETY,
    evidenceLevel: EVIDENCE_LEVELS.REFERENCE,
    verificationStatus: VERIFICATION_STATUS.APPLICATION_METADATA
  });
}

module.exports = {
  EVIDENCE_CATEGORIES,
  EVIDENCE_LEVELS,
  VERIFICATION_STATUS,
  classifyEvidenceLevel,
  createEvidenceItem,
  normalizeEuropePmc,
  normalizeCrossref,
  normalizePubChem,
  normalizeMonographIndication,
  normalizeExtraction,
  normalizeSafety
};
