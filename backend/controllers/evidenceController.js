const Plant = require('../models/Plant');
const { getPlantEvidence } = require('../services/evidence/evidenceService');
const { getScholarlyLiterature } = require('../services/evidence/literatureService');

/**
 * Controller for Evidence Retrieval Layer (PhytoVisionAI)
 */
exports.getPlantEvidence = async (req, res) => {
  try {
    const { plantIdOrClass } = req.params;

    if (!plantIdOrClass || typeof plantIdOrClass !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Plant ID or modelClass parameter is required.'
      });
    }

    let plant = null;
    try {
      plant = await Plant.findById(plantIdOrClass);
    } catch {
      // Not an ObjectId
    }

    if (!plant) {
      const escaped = (plantIdOrClass || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      plant = await Plant.findOne({
        $or: [
          { modelClass: plantIdOrClass.trim() },
          { scientificName: new RegExp(`^${escaped}$`, 'i') },
          { localName: new RegExp(`^${escaped}$`, 'i') }
        ]
      });
    }

    const result = await getPlantEvidence({
      plantId: plant?._id,
      modelClass: plant?.modelClass || plantIdOrClass,
      scientificName: plant?.scientificName || plantIdOrClass,
      localName: plant?.localName
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[Evidence Controller Error] getPlantEvidence:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve normalized plant evidence.',
      details: err.message
    });
  }
};

/**
 * Dedicated endpoint for scholarly literature retrieval.
 */
exports.getLiterature = async (req, res) => {
  try {
    const { scientificName } = req.query;
    if (!scientificName || typeof scientificName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Scientific name query parameter is required.'
      });
    }

    const result = await getScholarlyLiterature(scientificName);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[Evidence Controller Error] getLiterature:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve scholarly literature.',
      details: err.message
    });
  }
};
