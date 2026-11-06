const sequelize = require('../config/db');
const User = require('./User');
const Job = require('./Job');
const Interview = require('./Interview');
const Result = require('./Result');

// A candidate and an interviewer both belong to an interview
User.hasMany(Interview, { as: 'candidateInterviews', foreignKey: 'candidateId' });
User.hasMany(Interview, { as: 'interviewerInterviews', foreignKey: 'interviewerId' });
Interview.belongsTo(User, { as: 'candidate', foreignKey: 'candidateId' });
Interview.belongsTo(User, { as: 'interviewer', foreignKey: 'interviewerId' });

// An interview is for a job
Job.hasMany(Interview, { foreignKey: 'jobId' });
Interview.belongsTo(Job, { foreignKey: 'jobId' });

// An interview has one result
Interview.hasOne(Result, { foreignKey: 'interviewId' });
Result.belongsTo(Interview, { foreignKey: 'interviewId' });

module.exports = { sequelize, User, Job, Interview, Result };