const express = require('express');
const contextController = require('../controllers/contextController');

const router = express.Router();

// GET /api/context/location?lat=...&lon=...
router.get('/location', contextController.getLocationContext);

// GET /api/context/weather?city=...&state=...&country=...
router.get('/weather', contextController.getWeatherContext);

module.exports = router;
