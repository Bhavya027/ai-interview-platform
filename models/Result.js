const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Result = sequelize.define('Result', {
  code: { type: DataTypes.TEXT('long') },
  score: { type: DataTypes.INTEGER },
  aiFeedback: { type: DataTypes.TEXT('long') }
});

module.exports = Result;