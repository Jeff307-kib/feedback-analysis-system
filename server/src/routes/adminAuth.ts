import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../database/index.js';
import { users } from '../database/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

// Admin Lockout & Rate Limiting Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

interface AttemptRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

// In-memory store for tracking failed admin login attempts by key (IP or email)
const adminLoginAttempts = new Map<string, AttemptRecord>();

// Clean up stale attempt records older than 1 hour every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of adminLoginAttempts.entries()) {
    if (record.lockedUntil && record.lockedUntil > now) continue;
    if (now - record.lastAttemptAt > 60 * 60 * 1000) {
      adminLoginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

function getTrackingKey(req: any, email: string): string {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip';
  return `${clientIp}::${email.toLowerCase().trim()}`;
}

/**
 * POST /api/admin/auth/login
 * Dedicated, hardened login endpoint for System Administrators.
 * Enforces:
 * - Stricter rate limiting & consecutive failed attempts lockout (5 attempts -> 15 min lockout)
 * - Strict role check (role must be 'ADMIN')
 * - Shorter JWT lifetime (12 hours)
 * - Active account validation
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trackingKey = getTrackingKey(req, normalizedEmail);
    const now = Date.now();

    // 1. Check lockout status
    const record = adminLoginAttempts.get(trackingKey);
    if (record?.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return res.status(429).json({
        error: `Account temporarily locked due to multiple consecutive failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
        code: 'ACCOUNT_LOCKED',
        remainingSeconds,
        remainingMinutes,
      });
    }

    // 2. Fetch user from database
    const matchedUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (matchedUsers.length === 0) {
      // Record failed attempt
      const attempts = (record?.failedAttempts || 0) + 1;
      const isNowLocked = attempts >= MAX_FAILED_ATTEMPTS;
      adminLoginAttempts.set(trackingKey, {
        failedAttempts: attempts,
        lockedUntil: isNowLocked ? now + LOCKOUT_DURATION_MS : null,
        lastAttemptAt: now,
      });

      return res.status(401).json({
        error: 'Invalid administrator email or password',
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - attempts),
      });
    }

    const user = matchedUsers[0];

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const attempts = (record?.failedAttempts || 0) + 1;
      const isNowLocked = attempts >= MAX_FAILED_ATTEMPTS;
      adminLoginAttempts.set(trackingKey, {
        failedAttempts: attempts,
        lockedUntil: isNowLocked ? now + LOCKOUT_DURATION_MS : null,
        lastAttemptAt: now,
      });

      if (isNowLocked) {
        return res.status(429).json({
          error: 'Too many failed attempts. Admin account temporarily locked for 15 minutes.',
          code: 'ACCOUNT_LOCKED',
          remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        });
      }

      return res.status(401).json({
        error: 'Invalid administrator email or password',
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - attempts),
      });
    }

    // 4. Role Authorization: Must be 'ADMIN'
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied. This portal is strictly restricted to System Administrators.',
        code: 'FORBIDDEN_PORTAL',
      });
    }

    // 5. Account Status Check
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Admin account is suspended or deactivated. Contact system governance.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // 6. Reset failed attempts on success
    adminLoginAttempts.delete(trackingKey);

    // 7. Generate Admin JWT with shorter lifetime (12h session)
    const token = jwt.sign(
      { userId: user.id, role: user.role, portal: 'admin' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Admin authentication successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error in /api/admin/auth/login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/auth/lockout-status
 * Allows the frontend to check if the current IP or email is currently locked out.
 */
router.get('/lockout-status', (req, res) => {
  try {
    const email = (req.query.email as string) || '';
    const normalizedEmail = email.toLowerCase().trim();
    const trackingKey = getTrackingKey(req, normalizedEmail);
    const record = adminLoginAttempts.get(trackingKey);
    const now = Date.now();

    if (record?.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return res.json({
        isLocked: true,
        remainingSeconds,
        remainingMinutes: Math.ceil(remainingSeconds / 60),
      });
    }

    return res.json({
      isLocked: false,
      remainingAttempts: record ? Math.max(0, MAX_FAILED_ATTEMPTS - record.failedAttempts) : MAX_FAILED_ATTEMPTS,
    });
  } catch (error) {
    console.error('Error in /lockout-status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
