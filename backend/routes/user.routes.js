const express = require('express');
const router = express.Router();
// IMPORTANT: Make sure 'updateProfile' is included in this import
const { registerUser, loginUser, updateLocation, updateProfile } = require('../controllers/user.controller');
const { findNearbyStrangers } = require('../controllers/matching.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Public routes (no authentication needed)
router.post('/register', registerUser);
router.post('/login', loginUser);

// Authenticated routes (require authMiddleware)
router.get('/me', authMiddleware, (req, res) => {
  res.json({ message: `Logged in as user ${req.userId}` });
});
router.post('/update-location', authMiddleware, updateLocation);
router.get('/nearby-strangers', authMiddleware, findNearbyStrangers);

// --- NEW ROUTE ADDED BELOW ---
// Route for updating user profile including preferences - requires authentication
// This line is at user.routes.js:21
router.post('/update-profile', authMiddleware, updateProfile);


module.exports = router;