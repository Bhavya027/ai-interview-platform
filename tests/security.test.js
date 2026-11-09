const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = 'test_secret_for_ci';

describe('Password hashing', () => {
  test('hash is not the plain password', async () => {
    const hash = await bcrypt.hash('123456', 10);
    expect(hash).not.toBe('123456');
  });

  test('correct password matches the hash', async () => {
    const hash = await bcrypt.hash('123456', 10);
    expect(await bcrypt.compare('123456', hash)).toBe(true);
  });

  test('wrong password does not match the hash', async () => {
    const hash = await bcrypt.hash('123456', 10);
    expect(await bcrypt.compare('wrong', hash)).toBe(false);
  });
});

describe('JWT tokens', () => {
  test('token carries the user id and role', () => {
    const token = jwt.sign({ id: 1, role: 'candidate' }, SECRET, { expiresIn: '1d' });
    const payload = jwt.verify(token, SECRET);
    expect(payload.id).toBe(1);
    expect(payload.role).toBe('candidate');
  });

  test('token signed with another secret is rejected', () => {
    const token = jwt.sign({ id: 1 }, 'other_secret');
    expect(() => jwt.verify(token, SECRET)).toThrow();
  });

  test('expired token is rejected', () => {
    const token = jwt.sign({ id: 1 }, SECRET, { expiresIn: -10 });
    expect(() => jwt.verify(token, SECRET)).toThrow();
  });
});