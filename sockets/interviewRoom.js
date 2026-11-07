const jwt = require('jsonwebtoken');
const { Interview, User } = require('../models');

module.exports = (io) => {
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

        const user = await User.findByPk(userId);
        const roomId = 'interview-' + interviewId;

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.name = user.name;

        socket.emit('joined', { roomId, name: user.name, role: user.role });
        socket.to(roomId).emit('user-joined', { name: user.name });
      } catch (err) {
        socket.emit('join-error', 'Server error');
      }
    });

    // Uses the room the server stored, so users cannot write into other rooms
    socket.on('code-change', ({ code }) => {
      const { roomId } = socket.data;
      if (roomId) {
        socket.to(roomId).emit('code-update', code);
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