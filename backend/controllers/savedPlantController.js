const SavedPlant = require('../models/SavedPlant');
const Plant = require('../models/Plant');

// Helper to check guest access
function checkRegisteredUser(req, res) {
  if (!req.user || req.user.isGuest || (!req.user.sub && !req.user.id)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Persistent saved plants require an authenticated user account. Guests cannot save plants.'
    });
    return null;
  }
  return req.user.id || req.user.sub;
}

// POST /api/saved-plants or POST /api/saved-plants/:plantId
// Saves a plant to user's favorites
exports.savePlant = async (req, res) => {
  try {
    const userId = checkRegisteredUser(req, res);
    if (!userId) return;

    const rawPlantId = req.params.plantId || req.body.plantId;

    if (!rawPlantId || typeof rawPlantId !== 'string' || rawPlantId.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid plantId is required.'
      });
    }

    const cleanPlantId = rawPlantId.trim();

    // Verify plant exists
    let plant = null;
    if (cleanPlantId.match(/^[0-9a-fA-F]{24}$/)) {
      plant = await Plant.findById(cleanPlantId);
    }
    if (!plant) {
      plant = await Plant.findOne({
        $or: [
          { modelClass: new RegExp('^' + cleanPlantId + '$', 'i') },
          { scientificName: new RegExp('^' + cleanPlantId + '$', 'i') }
        ]
      });
    }

    if (!plant) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Plant with identifier '${cleanPlantId}' does not exist.`
      });
    }

    // Check if already saved
    const existing = await SavedPlant.findOne({ userId, plantId: plant._id });
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Plant is already in your saved collection.',
        savedPlant: existing
      });
    }

    const savedPlant = new SavedPlant({
      userId,
      plantId: plant._id,
      savedAt: new Date()
    });

    await savedPlant.save();

    return res.status(201).json({
      success: true,
      message: `${plant.commonName || plant.scientificName} saved to your collection.`,
      savedPlant: {
        id: savedPlant._id,
        userId: savedPlant.userId,
        plantId: plant._id,
        plant: {
          id: plant._id,
          commonName: plant.commonName,
          scientificName: plant.scientificName,
          modelClass: plant.modelClass,
          compounds: plant.compounds,
          safety: plant.safety
        },
        savedAt: savedPlant.savedAt
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Plant is already in your saved collection.'
      });
    }
    console.error('[SavedPlant Controller Error] savePlant:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save plant.',
      details: error.message
    });
  }
};

// DELETE /api/saved-plants/:plantId
// Removes a saved plant from user's favorites
exports.removeSavedPlant = async (req, res) => {
  try {
    const userId = checkRegisteredUser(req, res);
    if (!userId) return;

    const { plantId } = req.params;

    if (!plantId || typeof plantId !== 'string' || plantId.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid plantId parameter is required.'
      });
    }

    const cleanPlantId = plantId.trim();

    // Find the plant reference (by ObjectId, modelClass, or direct savedPlant id)
    let targetPlantId = cleanPlantId;
    if (!cleanPlantId.match(/^[0-9a-fA-F]{24}$/)) {
      const plant = await Plant.findOne({
        $or: [
          { modelClass: new RegExp('^' + cleanPlantId + '$', 'i') },
          { scientificName: new RegExp('^' + cleanPlantId + '$', 'i') }
        ]
      });
      if (plant) {
        targetPlantId = plant._id;
      }
    }

    const deleted = await SavedPlant.findOneAndDelete({
      userId,
      $or: [
        { plantId: targetPlantId },
        { _id: cleanPlantId.match(/^[0-9a-fA-F]{24}$/) ? cleanPlantId : null }
      ]
    });

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Saved plant record not found in your collection.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Plant removed from your saved collection.'
    });

  } catch (error) {
    console.error('[SavedPlant Controller Error] removeSavedPlant:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove saved plant.',
      details: error.message
    });
  }
};

// GET /api/saved-plants
// Retrieves all saved plants for the authenticated user
exports.getSavedPlants = async (req, res) => {
  try {
    const userId = checkRegisteredUser(req, res);
    if (!userId) return;

    const savedRecords = await SavedPlant.find({ userId })
      .sort({ savedAt: -1 })
      .populate('plantId', 'scientificName commonName modelClass compounds safety extraction taxonomy');

    const plants = savedRecords
      .filter(record => record.plantId != null)
      .map(record => ({
        savedId: record._id,
        savedAt: record.savedAt,
        plant: record.plantId
      }));

    return res.status(200).json({
      success: true,
      count: plants.length,
      savedPlants: plants
    });

  } catch (error) {
    console.error('[SavedPlant Controller Error] getSavedPlants:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve saved plants.',
      details: error.message
    });
  }
};

// GET /api/saved-plants/check/:plantId
// Checks whether a given plant is saved by the current user
exports.checkSavedStatus = async (req, res) => {
  try {
    const userId = checkRegisteredUser(req, res);
    if (!userId) return;

    const { plantId } = req.params;
    const cleanPlantId = (plantId || '').trim();

    let targetPlantId = cleanPlantId;
    if (!cleanPlantId.match(/^[0-9a-fA-F]{24}$/)) {
      const plant = await Plant.findOne({
        $or: [
          { modelClass: new RegExp('^' + cleanPlantId + '$', 'i') },
          { scientificName: new RegExp('^' + cleanPlantId + '$', 'i') }
        ]
      });
      if (plant) targetPlantId = plant._id;
    }

    const saved = await SavedPlant.findOne({ userId, plantId: targetPlantId });

    return res.status(200).json({
      saved: !!saved,
      savedId: saved ? saved._id : null
    });

  } catch (error) {
    console.error('[SavedPlant Controller Error] checkSavedStatus:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check saved plant status.',
      details: error.message
    });
  }
};

// GET /api/saved-plants/:plantId
// Retrieves a specific saved plant if saved by authenticated user, else 404
exports.getSavedPlantById = async (req, res) => {
  try {
    const userId = checkRegisteredUser(req, res);
    if (!userId) return;

    const { plantId } = req.params;
    if (!plantId || typeof plantId !== 'string' || plantId.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid plantId parameter is required.'
      });
    }

    const cleanPlantId = plantId.trim();
    let targetPlantId = cleanPlantId;
    if (!cleanPlantId.match(/^[0-9a-fA-F]{24}$/)) {
      const plant = await Plant.findOne({
        $or: [
          { modelClass: new RegExp('^' + cleanPlantId + '$', 'i') },
          { scientificName: new RegExp('^' + cleanPlantId + '$', 'i') },
          { commonName: new RegExp('^' + cleanPlantId + '$', 'i') }
        ]
      });
      if (plant) targetPlantId = plant._id;
    }

    const saved = await SavedPlant.findOne({
      userId,
      $or: [
        { plantId: targetPlantId },
        { _id: cleanPlantId.match(/^[0-9a-fA-F]{24}$/) ? cleanPlantId : null }
      ]
    }).populate('plantId', 'scientificName commonName modelClass compounds safety extraction taxonomy');

    if (!saved) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Saved plant record not found in your collection.',
        saved: false
      });
    }

    return res.status(200).json({
      success: true,
      saved: true,
      savedPlant: {
        id: saved._id,
        userId: saved.userId,
        plantId: saved.plantId ? saved.plantId._id : null,
        plant: saved.plantId,
        savedAt: saved.savedAt
      }
    });

  } catch (error) {
    console.error('[SavedPlant Controller Error] getSavedPlantById:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve saved plant.',
      details: error.message
    });
  }
};

