const express = require('express');
const router = express.Router();
const { register, login, me } = require('../controllers/authController');
const { protect, allowRoles } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);

// Test route, only interviewers can open this
router.get('/interviewer-only', protect, allowRoles('interviewer'), (req, res) => {
  res.json({ message: 'Welcome, interviewer!' });
});

module.exports = router;