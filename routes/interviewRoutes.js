const express = require('express');
const router = express.Router();
const {
  createSlot,
  getAvailableSlots,
  bookSlot,
  getMyInterviews,
  generateFeedback,
  getResult
} = require('../controllers/interviewController');
const { protect, allowRoles } = require('../middleware/auth');

router.post('/', protect, allowRoles('interviewer'), createSlot);
router.get('/available', protect, allowRoles('candidate'), getAvailableSlots);
router.get('/my', protect, getMyInterviews);
router.post('/:id/book', protect, allowRoles('candidate'), bookSlot);
router.post('/:id/feedback', protect, allowRoles('interviewer'), generateFeedback);
router.get('/:id/result', protect, getResult);

module.exports = router;