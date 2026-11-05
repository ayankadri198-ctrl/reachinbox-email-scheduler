import { Redis, RedisOptions } from 'ioredis';
import { env } from './env.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Redis');

export const isRedisConfigured = (): boolean => {
  const redisUrl = process.env.REDIS_URL || env.REDIS_URL;
  if (redisUrl && redisUrl.trim() !== '') {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (isServerless && (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1'))) {
      return false;
    }
    return true;
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return Boolean(env.REDIS_HOST);
};

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
          if (!isRedisConfigured()) {
            return null;
          }
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
      if (!isRedisConfigured()) {
        return null;
      }
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

let _redisClient: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!_redisClient) {
    _redisClient = new Redis({
      ...redisConnectionOptions,
      lazyConnect: true,
    });

    _redisClient.on('connect', () => {
      logger.info(`Connecting to Redis at ${redisConnectionOptions.host}:${redisConnectionOptions.port}...`);
    });

    _redisClient.on('ready', () => {
      logger.success('Connected to Redis server and ready');
    });

    _redisClient.on('error', (err: any) => {
      if ((err?.code === 'ECONNREFUSED' && !isRedisConfigured()) || err?.message?.includes('Connection is closed')) {
        return;
      }
      logger.error('Redis error:', err);
    });
  }

  return _redisClient;
};

// Create a standalone Redis client proxy that lazily instantiates or safely degrades
export const redisClient: Redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedisClient();
    if (!client) {
      if (prop === 'ping') {
        return async () => {
          throw new Error('Redis is not configured in this environment');
        };
      }
      if (prop === 'quit' || prop === 'disconnect') {
        return async () => {};
      }
      if (prop === 'on' || prop === 'off' || prop === 'removeListener') {
        return () => {};
      }
      throw new Error('Redis is not configured in this environment. Please configure REDIS_URL.');
    }
    if (prop === 'quit') {
      return async () => {
        try {
          await client.quit();
        } catch {
          // ignore already closed
        } finally {
          _redisClient = null;
        }
      };
    }
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

export const connectRedis = async (): Promise<void> => {
  if (!isRedisConfigured()) {
    logger.warn('Redis is not configured in this environment. Skipping startup check.');
    return;
  }
  try {
    const client = getRedisClient();
    const ping = await client?.ping();
    logger.success(`Redis ping response: ${ping}`);
  } catch (error) {
    logger.error('Redis connection failed during startup check', error);
    throw error;
  }
};

