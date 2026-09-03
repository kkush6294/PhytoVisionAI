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

// Expose POST /api/predict with custom Multer error handling
router.post('/predict', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'File size exceeds the limit of 5MB.'
        });
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: err.message || 'Error uploading file.'
      });
    }
    predictController.predictImage(req, res, next);
  });
});

module.exports = router;
