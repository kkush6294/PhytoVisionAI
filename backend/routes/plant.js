const express = require('express');
const plantController = require('../controllers/plantController');
const extractionController = require('../controllers/extractionController');
const safetyController = require('../controllers/safetyController');

const router = express.Router();

// GET /api/plants - list all plants with optional query parameters (?search, ?page, ?limit, ?sort)
router.get('/', plantController.getAllPlants);

// GET /api/plants/search/:query - search plants by common name, scientific name, or compound
router.get('/search/:query', plantController.searchPlants);

// GET /api/plants/:idOrClass/extraction - get extraction guidance for plant
router.get('/:idOrClass/extraction', extractionController.getExtraction);

// GET /api/plants/:idOrClass/safety - get safety and dosage guidance for plant
router.get('/:idOrClass/safety', safetyController.getSafety);

// GET /api/plants/:idOrClass - get single plant by ID, modelClass, or scientific name
router.get('/:idOrClass', plantController.getPlantByIdOrClass);

module.exports = router;


