import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Prisma');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectPrisma = async (): Promise<void> => {
  if (!process.env.DATABASE_URL) {
    logger.error('CRITICAL: DATABASE_URL environment variable is not defined!');
    logger.error('Please configure DATABASE_URL in your Render Web Service Environment settings.');
    throw new Error('DATABASE_URL environment variable is required.');
  }

  try {
    await prisma.$connect();
    logger.success('Connected to PostgreSQL via Prisma');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }
};

