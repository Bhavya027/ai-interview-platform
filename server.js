const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { sequelize } = require('./models');
const yoga = require('./gql/yoga');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(yoga.graphqlEndpoint, yoga);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/interviews', require('./routes/interviewRoutes'));

require('./sockets/interviewRoom')(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log('Server running on port ' + PORT);  
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    await sequelize.sync();
    console.log('Tables synced');
  } catch (err) {
    console.log('Database connection failed:', err.message);
  }
});