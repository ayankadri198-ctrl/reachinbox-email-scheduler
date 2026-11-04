import { Redis, RedisOptions } from 'ioredis';
import { env } from './env.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Redis');

export const redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    logger.warn(`Redis connection retry attempt #${times} in ${delay}ms`);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect on READONLY error
      return true;
    }
    return false;
  },
};

// Create a standalone Redis client for general health checks and queue inspections
export const redisClient = new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  logger.info(`Connecting to Redis at ${env.REDIS_HOST}:${env.REDIS_PORT}...`);
});

redisClient.on('ready', () => {
  logger.success('Connected to Redis server and ready');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

export const connectRedis = async (): Promise<void> => {
  try {
    const ping = await redisClient.ping();
    logger.success(`Redis ping response: ${ping}`);
  } catch (error) {
    logger.error('Redis connection failed during startup check', error);
    throw error;
  }
};

