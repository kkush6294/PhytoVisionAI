const express = require('express');
const savedPlantController = require('../controllers/savedPlantController');
const { authenticateJwt } = require('../middleware/authMiddleware');

const router = express.Router();

// All saved plant endpoints require authenticated registered user
router.use(authenticateJwt);

// GET /api/saved-plants - list saved plants for current user
router.get('/', savedPlantController.getSavedPlants);

// POST /api/saved-plants - save a plant to favorites (plantId in body)
router.post('/', savedPlantController.savePlant);

// POST /api/saved-plants/:plantId - save a plant to favorites (plantId in URL)
router.post('/:plantId', savedPlantController.savePlant);

// GET /api/saved-plants/check/:plantId - check if plant is saved
router.get('/check/:plantId', savedPlantController.checkSavedStatus);

// GET /api/saved-plants/:plantId - get single saved plant (404 if not saved)
router.get('/:plantId', savedPlantController.getSavedPlantById);

// DELETE /api/saved-plants/:plantId - remove plant from favorites
router.delete('/:plantId', savedPlantController.removeSavedPlant);

module.exports = router;


