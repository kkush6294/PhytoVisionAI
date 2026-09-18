const express = require('express');
const router = express.Router();
const { createRateLimiter } = require('../middleware/rateLimiter');
const comparisonController = require('../controllers/comparisonController');

const comparisonLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// POST /api/comparison/plants (or /api/plants/compare)
router.post('/plants', comparisonLimiter, comparisonController.comparePlants);

module.exports = router;
