import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { logger } from '../utils/logger.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/shenv';

// Create postgres connection
const queryClient = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Test connection
export async function connectToDatabase() {
  try {
    // Test query
    await queryClient`SELECT 1`;
    logger.info('Successfully connected to PostgreSQL');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await queryClient.end();
  logger.info('PostgreSQL connection closed');
  process.exit(0);
});
