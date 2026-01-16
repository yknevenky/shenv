import { Hono } from 'hono';
import { UserRepository } from '../db/repositories/user.js';
import { jwtMiddleware, attachUser, type AuthVariables } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export const serviceAccountRouter = new Hono<{ Variables: AuthVariables }>();

// Encryption/Decryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0] || '', 'hex');
  const encryptedText = parts[1] || '';
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Apply authentication middleware to all routes
serviceAccountRouter.use('*', jwtMiddleware, attachUser);

// Upload service account JSON
serviceAccountRouter.post('/upload', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const body = await c.req.json();

    // Validate the service account JSON structure
    if (!body || typeof body !== 'object') {
      return c.json({ error: true, message: 'Invalid JSON format' }, 400);
    }

    // Check required fields for Google service account
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return c.json({
        error: true,
        message: `Invalid service account JSON. Missing fields: ${missingFields.join(', ')}`,
      }, 400);
    }

    if (body.type !== 'service_account') {
      return c.json({
        error: true,
        message: 'Invalid service account JSON. Type must be "service_account"',
      }, 400);
    }

    // Encrypt and store the service account JSON
    const encryptedServiceAccount = encrypt(JSON.stringify(body));

    await UserRepository.updateServiceAccount(userId, encryptedServiceAccount);

    logger.info(`Service account uploaded for user: ${userId}`);

    return c.json({
      success: true,
      message: 'Service account uploaded successfully',
    });
  } catch (error: any) {
    logger.error('Service account upload error', error);
    return c.json({ error: true, message: 'Failed to upload service account' }, 500);
  }
});

// Get service account status
serviceAccountRouter.get('/status', async (c) => {
  try {
    const userId = c.get('userId') as number;
    const user = await UserRepository.findById(userId);

    if (!user) {
      return c.json({ error: true, message: 'User not found' }, 404);
    }

    return c.json({
      hasServiceAccount: user.hasServiceAccount,
      email: user.serviceAccount ? JSON.parse(decrypt(user.serviceAccount)).client_email : null,
    });
  } catch (error: any) {
    logger.error('Service account status error', error);
    return c.json({ error: true, message: 'Failed to get service account status' }, 500);
  }
});

// Delete service account
serviceAccountRouter.delete('/', async (c) => {
  try {
    const userId = c.get('userId') as number;

    await UserRepository.removeServiceAccount(userId);

    logger.info(`Service account deleted for user: ${userId}`);

    return c.json({
      success: true,
      message: 'Service account deleted successfully',
    });
  } catch (error: any) {
    logger.error('Service account delete error', error);
    return c.json({ error: true, message: 'Failed to delete service account' }, 500);
  }
});
