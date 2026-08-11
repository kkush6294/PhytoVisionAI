const express = require('express');
const multer = require('multer');
const predictController = require('../controllers/predictController');

const router = express.Router();

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Expose POST /api/predict
router.post('/predict', upload.single('image'), predictController.predictImage);

module.exports = router;
