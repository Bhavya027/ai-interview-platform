const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Interview = sequelize.define('Interview', {
  scheduledAt: { type: DataTypes.DATE, allowNull: false },
  status: {
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'),
    defaultValue: 'scheduled'
  }
});

module.exports = Interview;