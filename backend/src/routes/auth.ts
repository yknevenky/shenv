import { Hono } from 'hono';
import { UserRepository } from '../db/repositories/user.js';
import { generateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const authRouter = new Hono();

// Signup endpoint
authRouter.post('/signup', async (c) => {
  try {
    const { email, password } = await c.req.json();

    // Validation
    if (!email || !password) {
      return c.json({ error: true, message: 'Email and password are required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: true, message: 'Password must be at least 6 characters' }, 400);
    }

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return c.json({ error: true, message: 'User with this email already exists' }, 400);
    }

    // Create new user (password will be hashed by UserRepository.create)
    const user = await UserRepository.create(email, password);

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
    });

    logger.info(`New user signed up: ${user.email}`);

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        hasServiceAccount: user.hasServiceAccount,
      },
    }, 201);
  } catch (error: any) {
    logger.error('Signup error', error);
    return c.json({ error: true, message: 'Failed to create user' }, 500);
  }
});

// Signin endpoint
authRouter.post('/signin', async (c) => {
  try {
    const { email, password } = await c.req.json();

    // Validation
    if (!email || !password) {
      return c.json({ error: true, message: 'Email and password are required' }, 400);
    }

    // Find user
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return c.json({ error: true, message: 'Invalid email or password' }, 401);
    }

    // Check password
    const isPasswordValid = await UserRepository.comparePassword(user, password);
    if (!isPasswordValid) {
      return c.json({ error: true, message: 'Invalid email or password' }, 401);
    }

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
    });

    logger.info(`User signed in: ${user.email}`);

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        hasServiceAccount: user.hasServiceAccount,
      },
    });
  } catch (error: any) {
    logger.error('Signin error', error);
    return c.json({ error: true, message: 'Failed to sign in' }, 500);
  }
});
