import { Queue, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis.js';
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

// BullMQ Queue instance
export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
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

emailQueue.on('error', (err) => {
  logger.error('Email Queue encountered an error:', err);
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

  const job = await emailQueue.add('send-email', jobData, {
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
  try {
    const job = await emailQueue.getJob(jobId);
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

