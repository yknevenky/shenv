import { eq, and } from 'drizzle-orm';
import { db } from '../connection.js';
import { platformCredentials } from '../schema.js';
import crypto from 'crypto';

export type PlatformCredential = typeof platformCredentials.$inferSelect;
export type NewPlatformCredential = typeof platformCredentials.$inferInsert;

// Encryption configuration (from env)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-super-secret-encryption-key-change-in-production-64-chars';
const ALGORITHM = 'aes-256-cbc';

/**
 * Repository for managing platform credentials
 */
export class PlatformCredentialRepository {
  /**
   * Encrypt credentials JSON
   */
  private static encrypt(text: string): string {
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32)); // Use first 32 chars as key
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt credentials JSON
   */
  static decrypt(encrypted: string): string {
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32));
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0] || '', 'hex');
    const encryptedText = parts[1] || '';

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Create a new platform credential (with encryption)
   */
  static async create(
    userId: number,
    platform: 'google_workspace' | 'microsoft_365' | 'zoho' | 'dropbox' | 'box' | 'other',
    credentialsJson: string,
    credentialType: 'service_account' | 'oauth' | 'api_key' | 'other'
  ): Promise<PlatformCredential> {
    const encrypted = this.encrypt(credentialsJson);

    const [created] = await db
      .insert(platformCredentials)
      .values({
        userId,
        platform,
        credentials: encrypted,
        credentialType,
        isActive: true,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create platform credential');
    }

    return created;
  }

  /**
   * Find credential by user and platform
   */
  static async findByUserAndPlatform(
    userId: number,
    platform: string
  ): Promise<PlatformCredential | undefined> {
    const [credential] = await db
      .select()
      .from(platformCredentials)
      .where(and(
        eq(platformCredentials.userId, userId),
        eq(platformCredentials.platform, platform as any)
      ))
      .limit(1);

    return credential;
  }

  /**
   * Get all credentials for a user
   */
  static async findAllByUser(userId: number): Promise<PlatformCredential[]> {
    return db
      .select()
      .from(platformCredentials)
      .where(eq(platformCredentials.userId, userId));
  }

  /**
   * Get active credentials for a user
   */
  static async findActiveByUser(userId: number): Promise<PlatformCredential[]> {
    return db
      .select()
      .from(platformCredentials)
      .where(and(
        eq(platformCredentials.userId, userId),
        eq(platformCredentials.isActive, true)
      ));
  }

  /**
   * Get decrypted credentials
   */
  static async getDecryptedCredentials(
    userId: number,
    platform: string
  ): Promise<any | null> {
    const credential = await this.findByUserAndPlatform(userId, platform);

    if (!credential) {
      return null;
    }

    const decrypted = this.decrypt(credential.credentials);
    return JSON.parse(decrypted);
  }

  /**
   * Update credential's last used timestamp
   */
  static async updateLastUsed(id: number): Promise<void> {
    await db
      .update(platformCredentials)
      .set({ lastUsedAt: new Date() })
      .where(eq(platformCredentials.id, id));
  }

  /**
   * Deactivate a credential
   */
  static async deactivate(id: number): Promise<PlatformCredential> {
    const [updated] = await db
      .update(platformCredentials)
      .set({ isActive: false })
      .where(eq(platformCredentials.id, id))
      .returning();

    if (!updated) {
      throw new Error('Failed to deactivate credential');
    }

    return updated;
  }

  /**
   * Delete a credential
   */
  static async delete(id: number): Promise<void> {
    await db
      .delete(platformCredentials)
      .where(eq(platformCredentials.id, id));
  }

  /**
   * Delete all credentials for a user
   */
  static async deleteAllByUser(userId: number): Promise<void> {
    await db
      .delete(platformCredentials)
      .where(eq(platformCredentials.userId, userId));
  }

  /**
   * Check if user has credentials for a platform
   */
  static async hasCredentials(userId: number, platform: string): Promise<boolean> {
    const credential = await this.findByUserAndPlatform(userId, platform);
    return !!credential && credential.isActive;
  }

  /**
   * Get all platforms a user has credentials for
   */
  static async getUserPlatforms(userId: number): Promise<string[]> {
    const credentials = await this.findActiveByUser(userId);
    return credentials.map(c => c.platform);
  }
}
