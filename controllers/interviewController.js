const { Op } = require('sequelize');
const { Interview, User, Result } = require('../models');
const { getCodeFeedback } = require('../services/aiFeedback');
const { sendBookingEmail } = require('../services/mailer');

// Interviewer creates an open slot
exports.createSlot = async (req, res) => {
  try {
    const { scheduledAt, jobId } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ message: 'scheduledAt is required' });
    }

    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    if (date <= new Date()) {
      return res.status(400).json({ message: 'Interview time must be in the future' });
    }

    const interview = await Interview.create({
      scheduledAt: date,
      interviewerId: req.user.id,
      jobId: jobId || null
    });

    res.status(201).json({ message: 'Interview slot created', interview });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Candidate sees all open (unbooked) future slots
exports.getAvailableSlots = async (req, res) => {
  try {
    const slots = await Interview.findAll({
      where: {
        candidateId: null,
        status: 'scheduled',
        scheduledAt: { [Op.gt]: new Date() }
      },
      include: [{ model: User, as: 'interviewer', attributes: ['id', 'name', 'email'] }],
      order: [['scheduledAt', 'ASC']]
    });

    res.json({ slots });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Candidate books a slot
exports.bookSlot = async (req, res) => {
  try {
    // Only updates if the slot is still free, so two candidates cannot book the same slot
    const [updated] = await Interview.update(
      { candidateId: req.user.id },
      { where: { id: req.params.id, candidateId: null, status: 'scheduled' } }
    );

    if (!updated) {
      return res.status(409).json({ message: 'Slot not found or already booked' });
    }

    const interview = await Interview.findByPk(req.params.id, {
      include: [{ model: User, as: 'interviewer', attributes: ['id', 'name', 'email'] }]
    });
    const candidate = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email']
    });

    // Send the confirmation email in the background.
    // The booking is already saved, so a failed email never breaks the response.
    sendBookingEmail({
      to: candidate.email,
      name: candidate.name,
      startTime: interview.scheduledAt,
      interviewerName: interview.interviewer ? interview.interviewer.name : null
    }).catch((err) => console.error('Email error:', err.message));

    res.json({ message: 'Interview booked successfully', interview });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Both roles see their own interviews
exports.getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.findAll({
      where: {
        [Op.or]: [{ candidateId: req.user.id }, { interviewerId: req.user.id }]
      },
      include: [
        { model: User, as: 'interviewer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'candidate', attributes: ['id', 'name', 'email'] }
      ],
      order: [['scheduledAt', 'ASC']]
    });

    res.json({ interviews });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// Interviewer can (re)generate AI feedback from the saved code
exports.generateFeedback = async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    if (interview.interviewerId !== req.user.id) {
      return res.status(403).json({ message: 'Only the interviewer of this interview can do this' });
    }

    const result = await Result.findOne({ where: { interviewId: interview.id } });

    if (!result || !result.code || !result.code.trim()) {
      return res.status(400).json({ message: 'No saved code found for this interview' });
    }

    const feedback = await getCodeFeedback(result.code);

    await result.update({
      score: feedback.score,
      aiFeedback: JSON.stringify(feedback)
    });

    res.json({ message: 'AI feedback generated', feedback });
  } catch (err) {
    res.status(500).json({
      message: 'Could not generate AI feedback',
      error: err.message,
      reason: err.cause ? String(err.cause) : undefined
    });
  }
};

// Candidate or interviewer can read the saved result
exports.getResult = async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    const isMember =
      interview.candidateId === req.user.id || interview.interviewerId === req.user.id;

    if (!isMember) {
      return res.status(403).json({ message: 'You are not part of this interview' });
    }

    const result = await Result.findOne({ where: { interviewId: interview.id } });

    if (!result) {
      return res.status(404).json({ message: 'No result saved yet' });
    }

    res.json({
      result: {
        interviewId: result.interviewId,
        code: result.code,
        score: result.score,
        feedback: result.aiFeedback ? JSON.parse(result.aiFeedback) : null
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};