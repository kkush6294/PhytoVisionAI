const Plant = require('../models/Plant');
const { getSafetyInfo } = require('../services/scientific/safetyService');

/**
 * GET /api/safety/:idOrClass or GET /api/plants/:idOrClass/safety
 * Retrieves pharmacological safety monographs, recommended dosage, toxicity level,
 * and clinical precautions.
 */
exports.getSafety = async (req, res) => {
  try {
    const rawId = req.params.idOrClass || req.params.plantId || req.query.plant;

    if (!rawId || typeof rawId !== 'string' || rawId.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Plant identifier parameter is required.'
      });
    }

    const identifier = rawId.trim();
    let plant = null;

    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      plant = await Plant.findById(identifier);
    }

    if (!plant) {
      plant = await Plant.findOne({
        $or: [
          { modelClass: new RegExp('^' + identifier + '$', 'i') },
          { scientificName: new RegExp('^' + identifier + '$', 'i') },
          { commonName: new RegExp('^' + identifier + '$', 'i') }
        ]
      });
    }

    if (!plant) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Plant '${identifier}' not found in database.`
      });
    }

    const safetyInfo = getSafetyInfo(plant.scientificName, plant.modelClass);
    const safetyData = (safetyInfo && safetyInfo.available) ? safetyInfo : (plant.safety || { available: false });

    return res.status(200).json({
      success: true,
      plant: {
        id: plant._id,
        scientificName: plant.scientificName,
        commonName: plant.commonName,
        modelClass: plant.modelClass
      },
      safety: safetyData
    });

  } catch (error) {
    console.error('[Safety Controller Error] getSafety:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve safety guidance.',
      details: error.message
    });
  }
};

