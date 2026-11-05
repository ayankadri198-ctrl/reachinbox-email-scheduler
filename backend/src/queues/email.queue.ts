import { Queue, Job } from 'bullmq';
import { getRedisConnectionOptions, isRedisConfigured } from '../config/redis.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('EmailQueue');

export const EMAIL_QUEUE_NAME = 'email-scheduler';

export interface EmailJobData {
  emailId: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
}

let _emailQueue: Queue<EmailJobData> | null = null;

export const getEmailQueue = (): Queue<EmailJobData> | null => {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!_emailQueue) {
    _emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000, // 3s, 6s, 12s
        },
        removeOnComplete: false, // Keep completed job history in Redis
        removeOnFail: false, // Keep failed job history in Redis for inspection
      },
    });

    _emailQueue.on('error', (err: any) => {
      if ((err?.code === 'ECONNREFUSED' && !isRedisConfigured()) || err?.message?.includes('Connection is closed')) {
        return;
      }
      logger.error('Email Queue encountered an error:', err);
    });
  }

  return _emailQueue;
};

// BullMQ Queue instance (lazy proxy so module evaluation never throws or opens sockets)
export const emailQueue: Queue<EmailJobData> = new Proxy({} as Queue<EmailJobData>, {
  get(_target, prop) {
    const queue = getEmailQueue();
    if (!queue) {
      if (prop === 'close') {
        return async () => {};
      }
      if (prop === 'on' || prop === 'off' || prop === 'removeListener') {
        return () => {};
      }
      throw new Error('BullMQ Email Queue is unavailable: Redis is not configured in this environment.');
    }
    if (prop === 'close') {
      return async () => {
        try {
          await queue.close();
        } catch {
          // ignore already closed
        } finally {
          _emailQueue = null;
        }
      };
    }
    const val = (queue as any)[prop];
    return typeof val === 'function' ? val.bind(queue) : val;
  },
});

/**
 * Adds a delayed email job to BullMQ.
 * Delay is calculated purely from scheduled timestamp minus current time.
 */
export const addEmailJob = async (email: {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
}): Promise<Job<EmailJobData>> => {
  const queue = getEmailQueue();
  if (!queue) {
    const error: any = new Error(
      'Cannot schedule delayed email: Redis is not configured in this environment. Set REDIS_URL to enable scheduling.'
    );
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  const scheduledTime = new Date(email.scheduledAt).getTime();
  const now = Date.now();
  const delay = Math.max(0, scheduledTime - now);

  const jobData: EmailJobData = {
    emailId: email.id,
    userId: email.userId,
    recipient: email.recipient,
    subject: email.subject,
    body: email.body,
    scheduledAt: email.scheduledAt.toISOString(),
  };

  logger.info(
    `Adding BullMQ delayed job for email ${email.id}. Delay: ${delay}ms (~${(delay / 1000).toFixed(1)}s), Scheduled for: ${email.scheduledAt.toISOString()}`
  );

  const job = await queue.add('send-email', jobData, {
    jobId: email.id, // Using emailId as unique BullMQ Job ID
    delay,
  });

  logger.success(`BullMQ job ${job.id} registered successfully with delay ${delay}ms`);
  return job;
};

/**
 * Safely removes a job from BullMQ (for cancellation or rescheduling).
 */
export const removeEmailJob = async (jobId: string): Promise<boolean> => {
  const queue = getEmailQueue();
  if (!queue) {
    logger.warn(`BullMQ job ${jobId} not removed: Redis is not configured in this environment.`);
    return false;
  }

  try {
    const job = await queue.getJob(jobId);
    if (job) {
      // Remove job from Redis queue
      await job.remove();
      logger.info(`BullMQ job ${jobId} successfully removed from queue`);
      return true;
    }
    logger.warn(`BullMQ job ${jobId} not found in queue (may already have executed or expired)`);
    return false;
  } catch (error) {
    logger.error(`Error removing BullMQ job ${jobId}`, error);
    return false;
  }
};

/**
 * Reschedules an email by removing the existing BullMQ job and creating a new one.
 */
export const rescheduleEmailJob = async (email: {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
}): Promise<Job<EmailJobData>> => {
  // 1. Remove previous job if it exists
  await removeEmailJob(email.id);

  // 2. Add new delayed job
  return await addEmailJob(email);
};

