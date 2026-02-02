import type { Context, Next } from 'hono';
import { jwt, sign } from 'hono/jwt';
import type { JWTPayload } from 'hono/utils/jwt/types';
import { UserRepository, type User } from '../db/repositories/user.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

export interface JwtPayload extends JWTPayload {
  userId: number;
  email: string;
  tier?: 'individual_free' | 'individual_paid' | 'business';
}

// Context variables type
export type AuthVariables = {
  user: User;
  userId: number;
  jwtPayload: JwtPayload;
};

// Context type with custom variables
export type HonoContext = Context<{
  Variables: AuthVariables;
}>;

// Export Hono's JWT middleware configured with our secret
export const jwtMiddleware = jwt({
  secret: JWT_SECRET,
});

// Custom middleware to attach user to context after JWT verification
export async function attachUser(c: HonoContext, next: Next): Promise<Response | void> {
  try {
    const payload = c.get('jwtPayload') as JwtPayload;

    if (!payload || !payload.userId) {
      return c.json({ error: true, message: 'Unauthorized - Invalid token payload' }, 401);
    }

    const user = await UserRepository.findById(payload.userId);

    if (!user) {
      return c.json({ error: true, message: 'Unauthorized - User not found' }, 401);
    }

    // Attach user to context
    c.set('user', user);
    c.set('userId', user.id);

    await next();
  } catch (error: any) {
    return c.json({ error: true, message: 'Unauthorized' }, 401);
  }
}

// Helper to generate JWT tokens
export async function generateToken(payload: JwtPayload): Promise<string> {
  return await sign(payload, JWT_SECRET);
}
