const Plant = require('../models/Plant');
const { getExtractionGuidance } = require('../services/scientific/extractionService');

/**
 * GET /api/extraction/:idOrClass or GET /api/plants/:idOrClass/extraction
 * Retrieves laboratory extraction protocols and literature-backed extraction parameters
 * using the 2-tier extraction pipeline (dynamic Europe PMC + curated monograph fallback).
 */
exports.getExtraction = async (req, res) => {
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
          { commonName: new RegExp('^' + identifier + '$', 'i') },
          { localName: new RegExp('^' + identifier + '$', 'i') }
        ]
      });
    }

    if (!plant) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Plant '${identifier}' not found in database.`
      });
    }

    // Retrieve extraction guidance using 2-tier pipeline
    const extractionGuidance = await getExtractionGuidance(plant.scientificName, plant.modelClass);

    return res.status(200).json({
      success: true,
      plant: {
        id: plant._id,
        scientificName: plant.scientificName,
        commonName: plant.commonName,
        localName: plant.localName || null,
        modelClass: plant.modelClass,
        taxonomy: plant.taxonomy || null
      },
      extraction: extractionGuidance,
      databaseExtraction: plant.extraction || null
    });

  } catch (error) {
    console.error('[Extraction Controller Error] getExtraction:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve extraction guidance.',
      details: error.message
    });
  }
};

