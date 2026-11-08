const { createYoga, createSchema } = require('graphql-yoga');
const { GraphQLError } = require('graphql');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Interview, Result } = require('../models');

const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
  }

  type Result {
    score: Int
    summary: String
    strengths: [String!]!
    improvements: [String!]!
    code: String
  }

  type Interview {
    id: ID!
    scheduledAt: String!
    status: String!
    interviewer: User
    candidate: User
    result: Result
  }

  type Stats {
    total: Int!
    scheduled: Int!
    completed: Int!
    averageScore: Float
  }

  type Query {
    me: User
    myInterviews: [Interview!]!
    interview(id: ID!): Interview
    availableSlots: [Interview!]!
    stats: Stats!
  }
`;

// Every query needs a logged-in user (same JWT as the REST API)
function requireUser(context) {
  if (!context.user) {
    throw new GraphQLError('Not logged in', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return context.user;
}

function memberWhere(userId) {
  return { [Op.or]: [{ candidateId: userId }, { interviewerId: userId }] };
}

// The AI feedback is stored as JSON text, so it is parsed here
function parseFeedback(result) {
  try {
    return JSON.parse(result.aiFeedback) || {};
  } catch (err) {
    return {};
  }
}

const resolvers = {
  Query: {
    me: (_, __, context) => User.findByPk(requireUser(context).id),

    myInterviews: (_, __, context) => {
      const user = requireUser(context);
      return Interview.findAll({
        where: memberWhere(user.id),
        order: [['scheduledAt', 'ASC']]
      });
    },

    interview: async (_, { id }, context) => {
      const user = requireUser(context);
      const interview = await Interview.findByPk(id);
      if (!interview) return null;

      if (interview.candidateId !== user.id && interview.interviewerId !== user.id) {
        throw new GraphQLError('You are not part of this interview', {
          extensions: { code: 'FORBIDDEN' }
        });
      }
      return interview;
    },

    availableSlots: (_, __, context) => {
      requireUser(context);
      return Interview.findAll({
        where: { candidateId: null, status: 'scheduled', scheduledAt: { [Op.gt]: new Date() } },
        order: [['scheduledAt', 'ASC']]
      });
    },

    stats: async (_, __, context) => {
      const user = requireUser(context);
      const interviews = await Interview.findAll({ where: memberWhere(user.id) });
      const completedIds = interviews.filter((i) => i.status === 'completed').map((i) => i.id);

      let averageScore = null;
      if (completedIds.length) {
        const results = await Result.findAll({
          where: { interviewId: completedIds, score: { [Op.ne]: null } }
        });
        if (results.length) {
          averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
        }
      }

      return {
        total: interviews.length,
        scheduled: interviews.filter((i) => i.status === 'scheduled').length,
        completed: completedIds.length,
        averageScore
      };
    }
  },

  Interview: {
    scheduledAt: (interview) => new Date(interview.scheduledAt).toISOString(),
    interviewer: (interview) => User.findByPk(interview.interviewerId),
    candidate: (interview) => (interview.candidateId ? User.findByPk(interview.candidateId) : null),
    result: (interview) => Result.findOne({ where: { interviewId: interview.id } })
  },

  Result: {
    summary: (result) => parseFeedback(result).summary || null,
    strengths: (result) => parseFeedback(result).strengths || [],
    improvements: (result) => parseFeedback(result).improvements || []
  }
};

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/graphql',
  context: ({ request }) => {
    const header = request.headers.get('authorization') || '';
    if (!header.startsWith('Bearer ')) return { user: null };

    try {
      return { user: jwt.verify(header.split(' ')[1], process.env.JWT_SECRET) };
    } catch (err) {
      return { user: null };
    }
  }
});

module.exports = yoga;