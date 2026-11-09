const jwt = require('jsonwebtoken');
const { protect, allowRoles } = require('../middleware/auth');

process.env.JWT_SECRET = 'unit_test_secret';

// Small helper that fakes Express req / res / next
function makeMocks(headers = {}, user) {
  const req = { headers, user };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('protect middleware', () => {
  test('returns 401 when there is no Authorization header', () => {
    const { req, res, next } = makeMocks();
    protect(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Not logged in');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when the header does not start with Bearer', () => {
    const { req, res, next } = makeMocks({ authorization: 'Token abc' });
    protect(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for a garbage token', () => {
    const { req, res, next } = makeMocks({ authorization: 'Bearer not.a.token' });
    protect(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid or expired token');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for an expired token', () => {
    const token = jwt.sign({ id: 1, role: 'candidate' }, process.env.JWT_SECRET, {
      expiresIn: -10
    });
    const { req, res, next } = makeMocks({ authorization: 'Bearer ' + token });
    protect(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for a token signed with a different secret', () => {
    const token = jwt.sign({ id: 1, role: 'candidate' }, 'wrong_secret');
    const { req, res, next } = makeMocks({ authorization: 'Bearer ' + token });
    protect(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a valid token, sets req.user and calls next', () => {
    const token = jwt.sign({ id: 7, role: 'interviewer' }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });
    const { req, res, next } = makeMocks({ authorization: 'Bearer ' + token });
    protect(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.id).toBe(7);
    expect(req.user.role).toBe('interviewer');
  });
});

describe('allowRoles middleware', () => {
  test('lets an allowed role through', () => {
    const { req, res, next } = makeMocks({}, { id: 1, role: 'interviewer' });
    allowRoles('interviewer')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 403 when the role is not allowed', () => {
    const { req, res, next } = makeMocks({}, { id: 2, role: 'candidate' });
    allowRoles('interviewer')(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('You do not have permission');
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts any one of several allowed roles', () => {
    const { req, res, next } = makeMocks({}, { id: 2, role: 'candidate' });
    allowRoles('candidate', 'interviewer')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});