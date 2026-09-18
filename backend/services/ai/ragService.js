const { getPlantEvidence } = require('../evidence/evidenceService');
const { generateGroundedAnswer } = require('./llmService');

/**
 * Retrieval-Augmented Generation (RAG) Service (PhytoVisionAI)
 *
 * Implements strict evidence-grounded generation:
 * 1. Retrieves normalized evidence for authoritatively identified plant.
 * 2. Selects top relevant evidence items based on query intent.
 * 3. Constructs structured reference context [Ref 1], [Ref 2]...
 * 4. Dispatches to LLM with no-hallucination instruction.
 * 5. Attaches exact provenance records to output.
 */

function selectRelevantEvidence(evidenceItems, question) {
  if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) return [];
  const qLower = (question || '').toLowerCase();

  // Topic keywords
  const isCompound = /\b(compound|chemical|phytochemical|cid|molecule|alkaloid|flavonoid|active)\b/.test(qLower);
  const isExtraction = /\b(extract|solvent|maceration|temperature|duration|preparation|protocol)\b/.test(qLower);
  const isSafety = /\b(safe|toxic|contraindication|precaution|warning|side effect|pregnancy)\b/.test(qLower);
  const isMedicinal = /\b(medicinal|traditional|use|treat|remedy|ayurvedic|folk|disease|cough|pain|fever)\b/.test(qLower);
  const isLiterature = /\b(paper|study|journal|doi|research|clinical|trial|pubmed)\b/.test(qLower);

  const scored = evidenceItems.map(item => {
    let score = 1;
    const cat = item.evidenceCategory;
    if (isCompound && (cat === 'chemical' || cat === 'compound')) score += 10;
    if (isExtraction && cat === 'extraction') score += 10;
    if (isSafety && cat === 'safety') score += 10;
    if (isMedicinal && (cat === 'traditional_use' || cat === 'pharmacological' || cat === 'clinical')) score += 10;
    if (isLiterature && (item.sourceType === 'europe_pmc' || item.sourceType === 'crossref')) score += 8;

    // Check keyword overlap with claim or title
    const text = ((item.title || '') + ' ' + (item.claim || '')).toLowerCase();
    const words = qLower.split(/\s+/).filter(w => w.length > 3);
    for (const w of words) {
      if (text.includes(w)) score += 3;
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // Return top 8 most relevant evidence items
  return scored.slice(0, 8).map(s => s.item);
}

/**
 * Executes grounded RAG flow for plant-scoped questions.
 */
async function answerPlantQuestion({ plantId, modelClass, scientificName, localName, question }) {
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return {
      success: false,
      error: 'Question is required.'
    };
  }

  // 1. Authoritative Evidence Retrieval
  const evidenceRes = await getPlantEvidence({ plantId, modelClass, scientificName, localName });
  const plantInfo = evidenceRes.plant;
  const allEvidence = evidenceRes.evidenceItems || [];

  if (allEvidence.length === 0) {
    return {
      success: true,
      available: false,
      answer: 'Reliable evidence for this information was not found in the available sources.',
      citations: [],
      grounded: true,
      plant: plantInfo
    };
  }

  // 2. Select relevant evidence
  const selected = selectRelevantEvidence(allEvidence, question);

  // 3. Construct grounded context with numbered references
  const references = [];
  const contextLines = selected.map((ev, idx) => {
    const refTag = `[Ref ${idx + 1}]`;
    references.push({
      refTag,
      sourceType: ev.sourceType,
      sourceName: ev.sourceName,
      title: ev.title,
      authors: ev.authors,
      year: ev.year,
      doi: ev.doi,
      url: ev.url,
      evidenceCategory: ev.evidenceCategory,
      evidenceLevel: ev.evidenceLevel,
      verificationStatus: ev.verificationStatus,
      claim: ev.claim
    });

    const metaParts = [
      `Source: ${ev.sourceName}`,
      ev.evidenceCategory ? `Category: ${ev.evidenceCategory}` : null,
      ev.evidenceLevel ? `Level: ${ev.evidenceLevel}` : null,
      ev.doi ? `DOI: ${ev.doi}` : null,
      ev.year ? `Year: ${ev.year}` : null
    ].filter(Boolean).join(' | ');

    return `${refTag} (${metaParts})\nTitle: ${ev.title || 'N/A'}\nEvidence: ${ev.claim}\n`;
  });

  const groundedContext = contextLines.join('\n---\n');

  // 4. Grounded generation via LLM
  const llmRes = await generateGroundedAnswer({
    question: question.trim(),
    plantInfo,
    groundedContext,
    references
  });

  return {
    success: true,
    available: llmRes.available,
    answer: llmRes.answer,
    citations: llmRes.citations,
    grounded: true,
    plant: plantInfo,
    model: llmRes.model || null
  };
}

module.exports = {
  answerPlantQuestion,
  selectRelevantEvidence
};
