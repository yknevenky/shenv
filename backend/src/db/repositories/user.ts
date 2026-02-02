import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '../connection.js';
import { users } from '../schema.js';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export class UserRepository {
  // Create a new user
  static async create(
    email: string,
    password: string,
    tier: 'individual_free' | 'individual_paid' | 'business' = 'individual_free'
  ): Promise<User> {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        tier,
      })
      .returning();

    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return user;
  }

  // Find user by ID
  static async findById(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user;
  }

  // Compare password
  static async comparePassword(user: User, candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, user.passwordHash);
  }

  // Update service account - DEPRECATED: Use platform_credentials table instead
  // Keeping for backward compatibility, but this is a no-op now
  static async updateServiceAccount(userId: number, _serviceAccountJson: string): Promise<User> {
    // This method is deprecated - service accounts are now stored in platform_credentials table
    // Just return the user without making any changes
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user;
  }

  // Remove service account - DEPRECATED: Use platform_credentials table instead
  static async removeServiceAccount(userId: number): Promise<User> {
    // This method is deprecated - service accounts are now stored in platform_credentials table
    // Just return the user without making any changes
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user;
  }

  // Update user tier
  static async updateTier(
    userId: number,
    tier: 'individual_free' | 'individual_paid' | 'business'
  ): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ tier, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error(`Failed to update tier for user ${userId}`);
    }
    return updated;
  }
}
