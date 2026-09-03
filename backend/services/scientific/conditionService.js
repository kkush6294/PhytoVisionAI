const axios = require('axios');

const EUROPE_PMC_URL = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';
const CROSSREF_URL = 'https://api.crossref.org/works';
const REQUEST_TIMEOUT = 15000;

/**
 * Classifies scientific study type based on abstract and title keywords.
 * Rule: NEVER invent a study type. If evidence is ambiguous, return "Other / Unknown".
 */
function classifyStudyType(text) {
  if (!text || typeof text !== 'string') return 'Other / Unknown';
  const lower = text.toLowerCase();

  if (/\b(clinical trial|human subjects|randomized|patients|double-blind|clinical study|phase i|phase ii|phase iii)\b/.test(lower)) {
    return 'Clinical';
  }
  if (/\b(in vivo|rats|mice|murine|animal model|rabbits|wistar|in-vivo)\b/.test(lower)) {
    return 'In vivo / Animal';
  }
  if (/\b(in vitro|cell line|cell culture|assay|enzymatic|in-vitro|microplate)\b/.test(lower)) {
    return 'In vitro';
  }
  if (/\b(review|meta-analysis|systematic review|overview|perspective)\b/.test(lower)) {
    return 'Review';
  }

  return 'Other / Unknown';
}

/**
 * Generates evidence-based, non-promotional framing statements.
 * Rule: NEVER use "cures", "treats", or "guarantees treatment".
 */
function generateEvidenceStatement(scientificName, condition, studyType) {
  const cleanCondition = condition.trim();
  const cleanPlant = scientificName.trim();

  switch (studyType) {
    case 'Clinical':
      return `Clinical literature has examined the therapeutic potential and physiological effects of ${cleanPlant} in relation to ${cleanCondition}.`;
    case 'In vivo / Animal':
      return `Preclinical in vivo studies have evaluated the biological activity of ${cleanPlant} extracts in animal models of ${cleanCondition}.`;
    case 'In vitro':
      return `Laboratory in vitro assays have reported cellular or biochemical activity of ${cleanPlant} compounds relevant to ${cleanCondition}.`;
    case 'Review':
      return `Published scientific review literature has summarized pharmacological findings on ${cleanPlant} regarding ${cleanCondition}.`;
    default:
      return `Published research has investigated ${cleanPlant} in connection with ${cleanCondition}.`;
  }
}

/**
 * Main disease/health-condition evidence search function.
 */
async function searchDiseaseEvidence(scientificName, condition) {
  // 1) Input Validation
  if (!scientificName || typeof scientificName !== 'string' || scientificName.trim() === '' || scientificName === 'Unknown') {
    return {
      available: false,
      message: 'Valid plant scientific name is required for disease evidence search.'
    };
  }

  if (!condition || typeof condition !== 'string' || condition.trim() === '') {
    return {
      available: false,
      message: 'Please specify a health condition or disease to search scientific literature.'
    };
  }

  const cleanScientificName = scientificName.trim();
  const cleanCondition = condition.trim();

  try {
    // 2) Search Europe PMC REST API
    const europePmcQuery = `"${cleanScientificName}" AND ("${cleanCondition}") AND (pharmacological OR therapeutic OR clinical OR activity OR efficacy)`;

    const europePmcPromise = axios.get(EUROPE_PMC_URL, {
      params: {
        query: europePmcQuery,
        format: 'json',
        resultType: 'core',
        pageSize: 10
      },
      timeout: REQUEST_TIMEOUT
    }).catch(err => {
      console.error('[Europe PMC Disease Search Error]', err.message);
      return null;
    });

    // 3) Search Crossref REST API for complementary records
    const crossrefQuery = `"${cleanScientificName}" "${cleanCondition}"`;
    const crossrefPromise = axios.get(CROSSREF_URL, {
      params: {
        query: crossrefQuery,
        rows: 5,
        select: 'DOI,title,author,published,container-title,publisher,type'
      },
      headers: {
        'User-Agent': 'PhytoVisionAI-Research/1.0'
      },
      timeout: REQUEST_TIMEOUT
    }).catch(err => {
      console.error('[Crossref Disease Search Error]', err.message);
      return null;
    });

    const [pmcResponse, crossrefResponse] = await Promise.all([europePmcPromise, crossrefPromise]);

    const pmcArticles = pmcResponse?.data?.resultList?.result || [];
    const crossrefItems = crossrefResponse?.data?.message?.items || [];

    const processedResults = [];
    const seenDois = new Set();

    // Process Europe PMC results
    for (const article of pmcArticles) {
      const doi = article.doi || null;
      if (doi) seenDois.add(doi.toLowerCase());

      const fullText = `${article.title || ''} ${article.abstractText || ''}`;
      const studyType = classifyStudyType(fullText);
      const evidenceStatement = generateEvidenceStatement(cleanScientificName, cleanCondition, studyType);

      processedResults.push({
        id: article.id || article.pmid || `pmc-${Math.random().toString(36).substr(2, 9)}`,
        title: article.title || 'Untitled research article',
        journal: article.journalTitle || 'Scientific Journal',
        year: article.firstPublicationDate ? parseInt(article.firstPublicationDate.substring(0, 4), 10) : null,
        authors: article.authorString ? article.authorString.split(',').map(a => a.trim()).slice(0, 5) : [],
        abstract: article.abstractText || 'Abstract text not available in retrieved record.',
        doi: article.doi || null,
        pmid: article.pmid || null,
        studyType: studyType,
        evidenceStatement: evidenceStatement,
        source: 'Europe PMC'
      });
    }

    // Complement with Crossref results if missing
    for (const item of crossrefItems) {
      const doi = item.DOI || null;
      if (doi && seenDois.has(doi.toLowerCase())) continue;
      if (doi) seenDois.add(doi.toLowerCase());

      const title = item.title?.[0] || 'Untitled publication';
      const studyType = classifyStudyType(title);
      const evidenceStatement = generateEvidenceStatement(cleanScientificName, cleanCondition, studyType);

      const pubYear = item.published?.['date-parts']?.[0]?.[0] || null;

      processedResults.push({
        id: doi || `crossref-${Math.random().toString(36).substr(2, 9)}`,
        title: title,
        journal: item['container-title']?.[0] || item.publisher || 'Research Publication',
        year: pubYear,
        authors: (item.author || []).map(a => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean).slice(0, 5),
        abstract: 'Abstract snippet not available in Crossref metadata record.',
        doi: doi,
        pmid: null,
        studyType: studyType,
        evidenceStatement: evidenceStatement,
        source: 'Crossref'
      });

      if (processedResults.length >= 10) break;
    }

    if (processedResults.length === 0) {
      return {
        available: true,
        scientificName: cleanScientificName,
        condition: cleanCondition,
        totalFound: 0,
        results: [],
        message: `No specific peer-reviewed literature records were retrieved connecting ${cleanScientificName} with ${cleanCondition}.`,
        disclaimer: 'This feature summarizes published scientific literature and does not diagnose, prevent, cure, or treat disease. Consult a qualified healthcare professional for medical advice.'
      };
    }

    return {
      available: true,
      scientificName: cleanScientificName,
      condition: cleanCondition,
      totalFound: processedResults.length,
      results: processedResults,
      disclaimer: 'This feature summarizes published scientific literature and does not diagnose, prevent, cure, or treat disease. Consult a qualified healthcare professional for medical advice.'
    };

  } catch (error) {
    console.error('[Condition Service Error]', error.message);
    return {
      available: false,
      scientificName: cleanScientificName,
      condition: cleanCondition,
      results: [],
      error: 'Scientific literature query failed: ' + error.message,
      disclaimer: 'This feature summarizes published scientific literature and does not diagnose, prevent, cure, or treat disease.'
    };
  }
}

module.exports = {
  searchDiseaseEvidence,
  classifyStudyType
};
