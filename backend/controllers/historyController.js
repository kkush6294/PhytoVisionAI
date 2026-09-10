const IdentificationHistory = require('../models/IdentificationHistory');
const Plant = require('../models/Plant');

// Helper to check guest access
function checkRegisteredUser(req, res) {
  if (!req.user || req.user.isGuest || (!req.user.sub && !req.user.id)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Persistent identification history requires an authenticated user account. Guest identifications are not stored.'
    });
    return null;
  }
  return req.user.id || req.user.sub;
}

// POST /api/history
// Records an identification result into user's history
exports.recordHistory = async (req, res) => {
  try {
    const userId = checkRegisteredUser(req, res);
    if (!userId) return;

    const {
      plantId,
      modelClass,
      scientificName,
      commonName,
      localName,
      confidence,
      rejected,
      modelVersion,
      imageUrl,
      notes
    } = req.body;

    if (confidence === undefined || confidence === null || typeof confidence !== 'number') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'confidence is required and must be a number.'
      });
    }

    if ((!plantId || typeof plantId !== 'string' || plantId.trim() === '') &&
        (!scientificName || typeof scientificName !== 'string' || scientificName.trim() === '') &&
        (!modelClass || typeof modelClass !== 'string' || modelClass.trim() === '')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A valid plantId, scientificName, or modelClass is required.'
      });
    }

    // Resolve plant strictly from existing Plant collection
    let resolvedPlant = null;
    const cleanPlantId = (plantId || '').trim();
    const cleanScientificName = (scientificName || '').trim();
    const cleanModelClass = (modelClass || '').trim();

    if (cleanPlantId && cleanPlantId.match(/^[0-9a-fA-F]{24}$/)) {
      resolvedPlant = await Plant.findById(cleanPlantId);
    }

    if (!resolvedPlant && (cleanScientificName || cleanModelClass)) {
      const searchTerms = [cleanScientificName, cleanModelClass].filter(Boolean);
      resolvedPlant = await Plant.findOne({
        $or: [
          { scientificName: new RegExp('^' + cleanScientificName + '$', 'i') },
          { modelClass: { $in: searchTerms.map(t => new RegExp('^' + t + '$', 'i')) } },
          { commonName: new RegExp('^' + cleanScientificName + '$', 'i') },
          { localName: new RegExp('^' + cleanScientificName + '$', 'i') }
        ]
      });
    }

    if (!resolvedPlant && cleanPlantId) {
      resolvedPlant = await Plant.findOne({
        $or: [
          { modelClass: new RegExp('^' + cleanPlantId + '$', 'i') },
          { scientificName: new RegExp('^' + cleanPlantId + '$', 'i') }
        ]
      });
    }

    if (!resolvedPlant) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Plant record not found in database. Cannot create history for non-existent plant.'
      });
    }

    const historyEntry = new IdentificationHistory({
      userId,
      plantId: resolvedPlant._id,
      modelClass: (cleanModelClass || resolvedPlant.modelClass || '').trim(),
      scientificName: resolvedPlant.scientificName,
      commonName: (commonName || resolvedPlant.commonName || '').trim(),
      localName: (localName || resolvedPlant.localName || '').trim(),
      taxonomy: resolvedPlant.taxonomy || null,
      confidence: Math.round(confidence * 10000) / 10000,
      rejected: Boolean(rejected),
      modelVersion: modelVersion || 'MobileNetV2-1.0.0',
      imageUrl: imageUrl || null,
      notes: notes || null,
      uploadedAt: new Date()
    });

    await historyEntry.save();

    return res.status(201).json({
      success: true,
      message: 'Identification recorded in history.',
      history: historyEntry
    });

  } catch (error) {
    console.error('[History Controller Error] recordHistory:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to record identification history.',
      details: error.message
    });
  }
};

// GET /api/history
// Retrieves identification history for the authenticated user
exports.getHistory = async (req, res) => {
  try {
    const userId = checkRegisteredUser(req, res);
    if (!userId) return;

    const { page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { userId };

    const [total, history] = await Promise.all([
      IdentificationHistory.countDocuments(query),
      IdentificationHistory.find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('plantId', 'scientificName commonName localName modelClass compounds safety.toxicityLevel taxonomy')
    ]);

    const normalizedHistory = history.map(item => {
      const doc = item.toObject ? item.toObject() : { ...item };
      if (!doc.localName && doc.plantId?.localName) {
        doc.localName = doc.plantId.localName;
      }
      if (!doc.modelClass && doc.plantId?.modelClass) {
        doc.modelClass = doc.plantId.modelClass;
      }
      if (!doc.taxonomy && doc.plantId?.taxonomy) {
        doc.taxonomy = doc.plantId.taxonomy;
      }
      return doc;
    });

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      history: normalizedHistory
    });

  } catch (error) {
    console.error('[History Controller Error] getHistory:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve identification history.',
      details: error.message
    });
  }
};

// GET /api/history/:id
// Retrieves a single history record owned by the authenticated user
exports.getHistoryById = async (req, res) => {
  try {
    const userId = checkRegisteredUser(req, res);
    if (!userId) return;

    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid history entry ID is required.'
      });
    }

    const historyItem = await IdentificationHistory.findOne({
      _id: id,
      userId
    }).populate('plantId', 'scientificName commonName localName modelClass compounds safety.toxicityLevel extraction taxonomy');

    if (!historyItem) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'History record not found or unauthorized.'
      });
    }

    const doc = historyItem.toObject ? historyItem.toObject() : { ...historyItem };
    if (!doc.localName && doc.plantId?.localName) {
      doc.localName = doc.plantId.localName;
    }
    if (!doc.modelClass && doc.plantId?.modelClass) {
      doc.modelClass = doc.plantId.modelClass;
    }
    if (!doc.taxonomy && doc.plantId?.taxonomy) {
      doc.taxonomy = doc.plantId.taxonomy;
    }

    return res.status(200).json({
      success: true,
      history: doc
    });

  } catch (error) {
    console.error('[History Controller Error] getHistoryById:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve history item.',
      details: error.message
    });
  }
};

// DELETE /api/history/:id
// Deletes a specific history record owned by the authenticated user
exports.deleteHistoryItem = async (req, res) => {
  try {
    const userId = checkRegisteredUser(req, res);
    if (!userId) return;

    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid history entry ID is required.'
      });
    }

    const deleted = await IdentificationHistory.findOneAndDelete({
      _id: id,
      userId
    });

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'History record not found or unauthorized.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'History record deleted.'
    });

  } catch (error) {
    console.error('[History Controller Error] deleteHistoryItem:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete history item.',
      details: error.message
    });
  }
};

// DELETE /api/history
// Clears all history for the authenticated user
exports.clearHistory = async (req, res) => {
  try {
    const userId = checkRegisteredUser(req, res);
    if (!userId) return;

    const result = await IdentificationHistory.deleteMany({ userId });

    return res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} identification history entries.`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('[History Controller Error] clearHistory:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to clear identification history.',
      details: error.message
    });
  }
};

