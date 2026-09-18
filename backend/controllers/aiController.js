const Plant = require('../models/Plant');
const IdentificationHistory = require('../models/IdentificationHistory');
const { answerPlantQuestion } = require('../services/ai/ragService');

/**
 * Controller for Grounded AI Operations (PhytoVisionAI)
 *
 * Enforces strict plant-context binding, input validation, and user ownership.
 */
exports.askPlantQuestion = async (req, res) => {
  try {
    const { plantId, modelClass, historyId, question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'A non-empty question string is required.'
      });
    }

    if (question.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Question exceeds maximum allowed length of 500 characters.'
      });
    }

    // 1. Authoritative Plant Context Resolution
    let canonicalPlant = null;

    // If historyId is passed, authentication is strictly required
    if (historyId) {
      const authUserId = req.user && !req.user.isGuest ? (req.user.id || req.user.sub) : null;
      if (!authUserId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication is required when referencing an identification history record.'
        });
      }

      const histRecord = await IdentificationHistory.findOne({
        _id: historyId,
        userId: authUserId
      });

      if (!histRecord) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Referenced identification history record not found or unauthorized.'
        });
      }

      // Canonical plant identity is bound strictly from the verified history record
      canonicalPlant = await Plant.findOne({ modelClass: histRecord.modelClass });
      if (!canonicalPlant) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Botanical record for species in history is unavailable.'
        });
      }
    } else {
      // Resolve by plantId or modelClass for guest predictions or direct plant view
      if (plantId) {
        try {
          canonicalPlant = await Plant.findById(plantId);
        } catch {
          // invalid objectId format
        }
      }

      if (!canonicalPlant && modelClass && typeof modelClass === 'string') {
        canonicalPlant = await Plant.findOne({ modelClass: modelClass.trim() });
      }
    }

    if (!canonicalPlant) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'A valid, verified plant identifier (plantId, modelClass, or historyId) is required to establish botanical context.'
      });
    }

    // 2. Execute grounded RAG strictly bound to the canonical plant
    const result = await answerPlantQuestion({
      plantId: canonicalPlant._id,
      modelClass: canonicalPlant.modelClass,
      scientificName: canonicalPlant.scientificName,
      localName: canonicalPlant.localName,
      question: question.trim()
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[AI Controller Error] askPlantQuestion:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to process grounded plant question. Structured evidence remains accessible.',
      details: err.message
    });
  }
};
