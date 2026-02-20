import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters.');
  process.exit(1);
}

if (!AUTH_PASSWORD) {
  console.error('FATAL: AUTH_PASSWORD must be set.');
  process.exit(1);
}

export function login(req, res) {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Constant-time comparison via sha256 to avoid timing leaks and length oracle
  const inputHash = crypto.createHash('sha256').update(password).digest();
  const storedHash = crypto.createHash('sha256').update(AUTH_PASSWORD).digest();

  if (!crypto.timingSafeEqual(inputHash, storedHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ authorized: true }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
