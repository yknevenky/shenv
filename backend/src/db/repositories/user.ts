import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '../connection.js';
import { users } from '../schema.js';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export class UserRepository {
  // Create a new user
  static async create(email: string, password: string): Promise<User> {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
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

  // Update service account
  static async updateServiceAccount(userId: number, serviceAccountJson: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        serviceAccount: serviceAccountJson,
        hasServiceAccount: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      throw new Error(`Failed to update service account for user ID: ${userId}`);
    }
    return user;
  }

  // Remove service account
  static async removeServiceAccount(userId: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        serviceAccount: null,
        hasServiceAccount: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      throw new Error(`Failed to remove service account for user ID: ${userId}`);
    }
    return user;
  }
}
