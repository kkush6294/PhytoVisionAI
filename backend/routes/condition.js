const express = require('express');
const conditionController = require('../controllers/conditionController');

const router = express.Router();

// POST /api/condition-search
router.post('/condition-search', conditionController.searchCondition);

module.exports = router;
