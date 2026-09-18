const express = require('express');
const router = express.Router();
const { createRateLimiter } = require('../middleware/rateLimiter');
const evidenceController = require('../controllers/evidenceController');

const evidenceLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 150
});

// GET /api/evidence/literature?scientificName=...
router.get('/literature', evidenceLimiter, evidenceController.getLiterature);

// GET /api/evidence/:plantIdOrClass
router.get('/:plantIdOrClass', evidenceLimiter, evidenceController.getPlantEvidence);

module.exports = router;
