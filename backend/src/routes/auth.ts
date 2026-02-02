import { Hono } from 'hono';
import { UserRepository } from '../db/repositories/user.js';
import { PlatformCredentialRepository } from '../db/repositories/platform-credential.js';
import { generateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const authRouter = new Hono();

// Signup endpoint
authRouter.post('/signup', async (c) => {
  try {
    const { email, password, tier } = await c.req.json();

    // Validation
    if (!email || !password) {
      return c.json({ error: true, message: 'Email and password are required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: true, message: 'Password must be at least 6 characters' }, 400);
    }

    // Validate tier if provided
    const validTiers = ['individual_free', 'individual_paid', 'business'];
    const userTier = tier && validTiers.includes(tier) ? tier : 'individual_free';

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return c.json({ error: true, message: 'User with this email already exists' }, 400);
    }

    // Create new user (password will be hashed by UserRepository.create)
    const user = await UserRepository.create(email, password, userTier);

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      tier: user.tier,
    });

    logger.info(`New user signed up: ${user.email} (tier: ${user.tier})`);

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        hasPlatformCredentials: false, // New users never have credentials
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
      return c.json({ error: true, message: 'User does not exists' }, 404);
    }

    // Check password
    const isPasswordValid = await UserRepository.comparePassword(user, password);
    if (!isPasswordValid) {
      return c.json({ error: true, message: 'Invalid email or password' }, 401);
    }

    // Check if user has any platform credentials
    const credentials = await PlatformCredentialRepository.findAllByUser(user.id);
    const hasPlatformCredentials = credentials.length > 0;

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      tier: user.tier,
    });

    logger.info(`User signed in: ${user.email} (tier: ${user.tier})`);

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        hasPlatformCredentials,
      },
    });
  } catch (error: any) {
    logger.error('Signin error', error);
    return c.json({ error: true, message: 'Failed to sign in' }, 500);
  }
});
