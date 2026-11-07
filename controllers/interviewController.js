const { Op } = require('sequelize');
const { Interview, User } = require('../models');

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

    const interview = await Interview.findByPk(req.params.id);
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