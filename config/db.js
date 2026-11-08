require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    // Cloud databases need an encrypted (SSL) connection
    dialectOptions:
      process.env.DB_SSL === 'true'
        ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
        : {}
  }
);

module.exports = sequelize;