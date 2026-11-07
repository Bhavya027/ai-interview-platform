const jwt = require('jsonwebtoken');
const { Interview, User, Result } = require('../models');
const { getCodeFeedback } = require('../services/aiFeedback');

module.exports = (io) => {
  // Latest code of each room is kept in memory until the interview ends
  const roomCode = {};

  // Runs once when a socket connects: checks the JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Not logged in'));
    }

    try {
      socket.data.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-room', async ({ interviewId }) => {
      try {
        const userId = socket.data.user.id;
        const interview = await Interview.findByPk(interviewId);

        // Only the candidate or interviewer of this interview can join
        const isMember =
          interview &&
          (interview.candidateId === userId || interview.interviewerId === userId);

        if (!isMember) {
          return socket.emit('join-error', 'You are not part of this interview');
        }

        if (interview.status === 'completed') {
          return socket.emit('join-error', 'This interview has already ended');
        }

        const user = await User.findByPk(userId);
        const roomId = 'interview-' + interviewId;

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.interviewId = interviewId;
        socket.data.name = user.name;

        socket.emit('joined', { roomId, name: user.name, role: user.role });
        socket.to(roomId).emit('user-joined', { name: user.name });

        // A late joiner receives the code written so far
        if (roomCode[roomId]) {
          socket.emit('code-update', roomCode[roomId]);
        }
      } catch (err) {
        socket.emit('join-error', 'Server error');
      }
    });

    // Uses the room the server stored, so users cannot write into other rooms
    socket.on('code-change', ({ code }) => {
      const { roomId } = socket.data;
      if (roomId) {
        roomCode[roomId] = code;
        socket.to(roomId).emit('code-update', code);
      }
    });

    // Only the interviewer can end the interview
    socket.on('end-interview', async () => {
      try {
        const { roomId, interviewId } = socket.data;

        if (!roomId) return;

        if (socket.data.user.role !== 'interviewer') {
          return socket.emit('join-error', 'Only the interviewer can end the interview');
        }

        const code = roomCode[roomId] || '';

        const existing = await Result.findOne({ where: { interviewId } });
        if (existing) {
          await existing.update({ code });
        } else {
          await Result.create({ interviewId, code });
        }

        await Interview.update({ status: 'completed' }, { where: { id: interviewId } });

        delete roomCode[roomId];
        io.to(roomId).emit('interview-ended');

        // AI feedback runs after the interview is closed, so nobody waits for it
        if (!code.trim()) {
          return io.to(roomId).emit('feedback-error', 'No code was written, so there is nothing to review');
        }

        try {
          const feedback = await getCodeFeedback(code);

          await Result.update(
            { score: feedback.score, aiFeedback: JSON.stringify(feedback) },
            { where: { interviewId } }
          );

          io.to(roomId).emit('feedback-ready', feedback);
        } catch (aiErr) {
          console.log('AI feedback failed:', aiErr.message, aiErr.cause);
          io.to(roomId).emit('feedback-error', 'AI feedback could not be generated');
        }
      } catch (err) {
        socket.emit('join-error', 'Could not end the interview');
      }
    });

    socket.on('disconnect', () => {
      const { roomId, name } = socket.data;
      if (roomId) {
        socket.to(roomId).emit('user-left', { name });
      }
    });
  });
};