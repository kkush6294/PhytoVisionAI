const express = require('express');
const extractionController = require('../controllers/extractionController');

const router = express.Router();

// GET /api/extraction/:idOrClass - retrieve extraction guidance for plant
router.get('/:idOrClass', extractionController.getExtraction);

module.exports = router;

