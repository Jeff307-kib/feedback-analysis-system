import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../database';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';
import { checkInactivePlanExpirations } from './subscriptions.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, companyName, companyEmail } = req.body;

    if (!username || !email || !password || !companyName || !companyEmail) {
      return res.status(400).json({ error: 'Username, email, password, company name, and company email are required' });
    }

    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists' }); // Generic error preferable for prod, but clear for now
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      username,
      email: email.toLowerCase(),
      passwordHash,
      companyName,
      companyEmail,
      role: 'RETAIL_MANAGER', // Default role for registration
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
    });

    res.status(201).json({ message: 'User registered successfully', user: newUser[0] });
  } catch (error) {
    console.error('Error in /register:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const matchedUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    
    if (matchedUsers.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' }); // Generic error per PRD
    }

    const user = matchedUsers[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended or deleted' });
    }

    // Check and expire any inactive plan subscriptions past period end
    await checkInactivePlanExpirations();

    // Create JWT
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token, // Return token. Usually it's better in HttpOnly cookie, but we can do both or just return it.
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
