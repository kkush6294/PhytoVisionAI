const express = require('express');
const recommendationController = require('../controllers/recommendationController');

const router = express.Router();

// GET /api/recommendations/condition/:condition - recommend plants by condition/symptom
router.get('/condition/:condition', recommendationController.recommendByCondition);

// POST /api/recommendations/condition - recommend plants by condition/symptom (in body)
router.post('/condition', recommendationController.recommendByCondition);

// POST /api/recommendations/symptoms - recommend plants by symptoms (in body)
router.post('/symptoms', recommendationController.recommendByCondition);

module.exports = router;

