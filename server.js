const express = require('express');
const { sequelize } = require('./models');
const app = express();

app.use(express.json());
app.use('/api/auth', require('./routes/authRoutes'));

app.get('/', (req, res) => {
  res.send('AI Interview Platform is running!');
});

app.listen(3000, async () => {
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