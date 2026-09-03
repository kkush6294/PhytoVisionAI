const Plant = require('../models/Plant');

/**
 * GET /api/recommendations/condition/:condition
 * POST /api/recommendations/condition
 * POST /api/recommendations/symptoms
 * Recommends medicinal plants grounded in verified pharmacological properties
 * and traditional medicinal uses for a specified condition or symptom.
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

    const term = rawTerm.trim();
    const regex = new RegExp(term, 'i');

    const matchedPlants = await Plant.find({
      $or: [
        { medicinalProperties: regex },
        { 'safety.recommendedDosage': regex },
        { 'safety.safetyNotes': regex },
        { 'safety.precautions': regex },
        { 'extraction.preparation': regex },
        { compounds: regex },
        { commonName: regex },
        { alternateNames: regex }
      ]
    })
      .sort({ commonName: 1 })
      .select('scientificName commonName modelClass medicinalProperties compounds safety taxonomy');

    const recommendations = matchedPlants.map(plant => ({
      id: plant._id,
      scientificName: plant.scientificName,
      commonName: plant.commonName,
      modelClass: plant.modelClass,
      medicinalProperties: plant.medicinalProperties || [],
      compounds: plant.compounds || [],
      dosage: plant.safety?.recommendedDosage || null,
      toxicityLevel: plant.safety?.toxicityLevel || null,
      precautions: plant.safety?.precautions || [],
      safetyNotes: plant.safety?.safetyNotes || null
    }));

    return res.status(200).json({
      success: true,
      condition: term,
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

