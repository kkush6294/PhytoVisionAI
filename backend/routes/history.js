const express = require('express');
const historyController = require('../controllers/historyController');
const { authenticateJwt } = require('../middleware/authMiddleware');

const router = express.Router();

// All history endpoints require authentication
router.use(authenticateJwt);

// POST /api/history - record identification in history
router.post('/', historyController.recordHistory);

// GET /api/history - list identification history for current user
router.get('/', historyController.getHistory);

// GET /api/history/:id - get single history record by ID
router.get('/:id', historyController.getHistoryById);

// DELETE /api/history/:id - delete single history record
router.delete('/:id', historyController.deleteHistoryItem);

// DELETE /api/history - clear all history for current user
router.delete('/', historyController.clearHistory);

module.exports = router;

