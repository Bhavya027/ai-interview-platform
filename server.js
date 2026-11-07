const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('AI Interview Platform is running!');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/interviews', require('./routes/interviewRoutes'));

require('./sockets/interviewRoom')(io);

server.listen(3000, async () => {
  console.log('Server running at http://localhost:3000');
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    await sequelize.sync();
    console.log('Tables synced');
  } catch (err) {
    console.log('Database connection failed:', err.message);
  }
});