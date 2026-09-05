const Plant = require('../models/Plant');

/**
 * Normalizes user health expressions into canonical medical/indication concepts.
 * STRICT RULE: Only normalizes user wording. NEVER fabricates unsupported medical equivalences.
 */
function normalizeQuery(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const clean = raw.trim().toLowerCase();

  const QUERY_MAP = {
    // Respiratory
    'coughing': 'cough',
    'coughs': 'cough',
    'cold': 'common cold',
    'cold symptoms': 'common cold',
    'head cold': 'common cold',
    'colds': 'common cold',
    'throat irritation': 'sore throat',
    'throat pain': 'sore throat',
    'pharyngitis': 'sore throat',
    'nasal catarrh': 'nasal congestion',
    'stuffy nose': 'nasal congestion',

    // Digestive
    'stomach upset': 'indigestion',
    'stomach ache': 'indigestion',
    'stomach discomfort': 'indigestion',
    'dyspepsia': 'indigestion',
    'acid reflux': 'heartburn',
    'hyperacidity': 'heartburn',
    'gastritis': 'heartburn',
    'loose stools': 'diarrhea',
    'bowel looseness': 'diarrhea',
    'bloating': 'flatulence',
    'gas': 'flatulence',
    'queasiness': 'nausea',
    'vomiting sensation': 'nausea',
    'hard stools': 'constipation',
    'sluggish bowel': 'constipation',
    'gastric ulcer': 'stomach ulcer',
    'peptic ulcer': 'stomach ulcer',

    // Skin
    'pruritus': 'itching',
    'skin itching': 'itching',
    'abrasions': 'minor wounds',
    'cuts': 'minor wounds',
    'wounds': 'minor wounds',
    'wound': 'minor wounds',
    'thermal burns': 'burns',
    'sunburn': 'minor burns',
    'acne': 'minor skin irritation',
    'pimples': 'minor skin irritation',
    'skin rash': 'minor skin irritation',

    // General & Metabolic
    'pyrexia': 'fever',
    'fevers': 'fever',
    'mild febrile illness': 'fever',
    'high blood sugar': 'diabetes',
    'blood glucose': 'diabetes',
    'glycemic support': 'diabetes',
    'type 2 diabetes': 'diabetes',
    'hypertension': 'high blood pressure',
    'elevated blood pressure': 'high blood pressure',
    'arthritic pain': 'joint pain',
    'rheumatic pain': 'joint pain',
    'joint stiffness': 'joint pain',
    'osteoarthritis pain': 'joint pain',
    'tension headache': 'headache',
    'sleeplessness': 'insomnia',
    'anxiety': 'stress',
    'mental fatigue': 'stress',
    'nervous tension': 'stress'
  };

  return QUERY_MAP[clean] || clean;
}

/**
 * GET /api/recommendations/condition/:condition
 * POST /api/recommendations/condition
 * POST /api/recommendations/symptoms
 * Recommends medicinal plants grounded in verified pharmacological properties
 * and structured indications.
 *
 * PROHIBITION CHECK:
 * - Does NOT use safety.recommendedDosage, safety.precautions, safety.safetyNotes,
 *   or extraction.preparation for determining match eligibility.
 */
exports.recommendByCondition = async (req, res) => {
  try {
    const rawTerm = req.params.condition ||
                    req.body.condition ||
                    req.body.symptom ||
                    req.query.condition ||
                    req.query.symptom;

    if (!rawTerm || typeof rawTerm !== 'string' || rawTerm.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Health condition or symptom query parameter is required.'
      });
    }

    const originalTerm = rawTerm.trim();
    const normalizedTerm = normalizeQuery(originalTerm);

    // Escape special regex characters
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRegex = new RegExp(`^${escapeRegex(normalizedTerm)}$`, 'i');
    const boundaryRegex = new RegExp(`\\b${escapeRegex(normalizedTerm)}\\b`, 'i');

    // Query MongoDB: Search ONLY indications.term, indications.aliases, and medicinalProperties
    const matchedPlants = await Plant.find({
      $or: [
        { 'indications.term': exactRegex },
        { 'indications.aliases': exactRegex },
        { 'indications.term': boundaryRegex },
        { 'indications.aliases': boundaryRegex },
        { medicinalProperties: boundaryRegex }
      ]
    })
      .sort({ commonName: 1 })
      .select('scientificName commonName localName modelClass medicinalProperties indications compounds safety taxonomy');

    const recommendations = matchedPlants.map(plant => {
      // Find the specific matched indication for transparent provenance attribution
      const matchedInd = (plant.indications || []).find(ind => {
        if (exactRegex.test(ind.term) || boundaryRegex.test(ind.term)) return true;
        return (ind.aliases || []).some(alias => exactRegex.test(alias) || boundaryRegex.test(alias));
      });

      return {
        id: plant._id,
        plant: plant.localName || plant.commonName || plant.modelClass,
        scientificName: plant.scientificName,
        commonName: plant.commonName,
        localName: plant.localName || null,
        modelClass: plant.modelClass,
        matchedIndication: matchedInd ? matchedInd.term : normalizedTerm,
        category: matchedInd ? matchedInd.category : 'pharmacognosy',
        evidenceType: matchedInd ? matchedInd.evidenceType : 'traditional_use',
        evidenceSource: matchedInd ? matchedInd.source : (plant.safety?.source || 'Botanical Monograph'),
        citation: matchedInd ? matchedInd.citation : null,
        url: matchedInd ? matchedInd.url : null,
        medicinalProperties: plant.medicinalProperties || [],
        compounds: plant.compounds || [],
        dosage: plant.safety?.recommendedDosage || null,
        toxicityLevel: plant.safety?.toxicityLevel || null,
        precautions: plant.safety?.precautions || [],
        safetyNotes: plant.safety?.safetyNotes || null
      };
    });

    return res.status(200).json({
      success: true,
      condition: originalTerm,
      normalizedCondition: normalizedTerm,
      count: recommendations.length,
      recommendations
    });

  } catch (error) {
    console.error('[Recommendation Controller Error] recommendByCondition:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve condition recommendations.',
      details: error.message
    });
  }
};

