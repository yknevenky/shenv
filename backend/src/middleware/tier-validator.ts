/**
 * Tier validation middleware
 * Restricts routes based on user tier
 */

import type { Context, Next } from 'hono';
import type { User } from '../db/repositories/user.js';

export type UserTier = 'individual_free' | 'individual_paid' | 'business';

/**
 * Middleware to require minimum tier
 */
export function requireTier(...allowedTiers: UserTier[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as User;

    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    if (!allowedTiers.includes(user.tier)) {
      return c.json({
        error: true,
        message: `This feature requires ${allowedTiers.join(' or ')} tier`,
        currentTier: user.tier,
        requiredTiers: allowedTiers,
      }, 403);
    }

    await next();
  };
}

/**
 * Middleware to require paid tier (individual_paid or business)
 */
export function requirePaidTier() {
  return requireTier('individual_paid', 'business');
}

/**
 * Middleware to require business tier only
 */
export function requireBusinessTier() {
  return requireTier('business');
}

/**
 * Helper to check if user has paid tier
 */
export function isPaidUser(user: User): boolean {
  return user.tier === 'individual_paid' || user.tier === 'business';
}

/**
 * Helper to check if user is business tier
 */
export function isBusinessUser(user: User): boolean {
  return user.tier === 'business';
}
