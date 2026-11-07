module.exports = (io) => {
  io.on('connection', (socket) => {
    // A user joins the room of one interview
    socket.on('join-room', ({ roomId, name }) => {
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.name = name;
      socket.to(roomId).emit('user-joined', { name });
    });

    // Code typed by one user is sent to everyone else in the same room
    socket.on('code-change', ({ roomId, code }) => {
      socket.to(roomId).emit('code-update', code);
    });

    socket.on('disconnect', () => {
      const { roomId, name } = socket.data;
      if (roomId) {
        socket.to(roomId).emit('user-left', { name });
      }
    });
  });
};