const express = require('express');
const router = express.Router();
const { createRateLimiter } = require('../middleware/rateLimiter');
const aiController = require('../controllers/aiController');
const { optionalJwt } = require('../middleware/authMiddleware');

// Rate limiting specifically for AI/LLM operations
const aiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per window
  message: {
    message: 'AI assistant rate limit exceeded. Please wait a few minutes before asking more questions.'
  }
});

// POST /api/ai/plant-question (supports both guest predictions and user history)
router.post('/plant-question', aiLimiter, optionalJwt, aiController.askPlantQuestion);

module.exports = router;
