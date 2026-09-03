const express = require('express');
const safetyController = require('../controllers/safetyController');

const router = express.Router();

// GET /api/safety/:idOrClass - retrieve safety and pharmacological dosage info for plant
router.get('/:idOrClass', safetyController.getSafety);

module.exports = router;

