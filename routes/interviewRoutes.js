const express = require('express');
const router = express.Router();
const {
  createSlot,
  getAvailableSlots,
  bookSlot,
  getMyInterviews
} = require('../controllers/interviewController');
const { protect, allowRoles } = require('../middleware/auth');

router.post('/', protect, allowRoles('interviewer'), createSlot);
router.get('/available', protect, allowRoles('candidate'), getAvailableSlots);
router.post('/:id/book', protect, allowRoles('candidate'), bookSlot);
router.get('/my', protect, getMyInterviews);

module.exports = router;