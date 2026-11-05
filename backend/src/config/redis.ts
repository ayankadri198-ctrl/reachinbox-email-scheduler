import { Redis, RedisOptions } from 'ioredis';
import { env } from './env.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Redis');

export const getRedisConnectionOptions = (): RedisOptions => {
  const redisUrl = env.REDIS_URL || process.env.REDIS_URL;
  if (redisUrl && redisUrl.trim() !== '') {
    try {
      const parsed = new URL(redisUrl);
      const isTls = parsed.protocol === 'rediss:';
      const options: RedisOptions = {
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : (isTls ? 6380 : 6379),
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        connectTimeout: 5000,
        retryStrategy(times) {
          if (times > 3) {
            logger.warn(`Redis max connection retry limit reached (${times}).`);
            return null;
          }
          const delay = Math.min(times * 200, 1000);
          logger.warn(`Redis connection retry attempt #${times} in ${delay}ms`);
          return delay;
        },
        reconnectOnError(err) {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      };

      if (isTls) {
        options.tls = { rejectUnauthorized: false };
      }

      if (parsed.pathname && parsed.pathname.length > 1) {
        const dbIndex = parseInt(parsed.pathname.slice(1), 10);
        if (!isNaN(dbIndex)) {
          options.db = dbIndex;
        }
      }

      return options;
    } catch (e) {
      logger.warn(`Failed to parse REDIS_URL with URL parser: ${e}`);
    }
  }

  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    connectTimeout: 5000,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn(`Redis max connection retry limit reached (${times}).`);
        return null;
      }
      const delay = Math.min(times * 200, 1000);
      logger.warn(`Redis connection retry attempt #${times} in ${delay}ms`);
      return delay;
    },
    reconnectOnError(err) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  };
};

export const redisConnectionOptions: RedisOptions = getRedisConnectionOptions();

// Create a standalone Redis client for general health checks and queue inspections
export const redisClient = new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  logger.info(`Connecting to Redis at ${redisConnectionOptions.host}:${redisConnectionOptions.port}...`);
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

