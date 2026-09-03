const express = require('express');
const authController = require('../controllers/authController');
const { authenticateJwt, optionalJwt } = require('../middleware/authMiddleware');

const router = express.Router();

// Register new user
router.post('/register', authController.register);

// Login existing user
router.post('/login', authController.login);

// Guest session (optional)
router.post('/guest', authController.guest);

// Get current user profile (protected)
router.get('/me', authenticateJwt, authController.me);

// Update user profile (protected)
router.put('/profile', authenticateJwt, authController.update);

// Logout (protected)
router.post('/logout', authenticateJwt, authController.logout);

module.exports = router;
