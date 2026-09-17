const express = require('express');
const contextController = require('../controllers/contextController');

const router = express.Router();

// GET /api/context/location?lat=...&lon=...
router.get('/location', contextController.getLocationContext);

module.exports = router;
