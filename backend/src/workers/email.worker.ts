import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData } from '../queues/email.queue.js';
import { redisConnectionOptions } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { smtpService } from '../services/smtp.service.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('EmailWorker');

export const createEmailWorker = () => {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, recipient, subject, body } = job.data;
      const currentAttempt = job.attemptsMade + 1;
      const maxAttempts = job.opts.attempts || 3;

      logger.info(
        `[Job ${job.id}] Processing email delivery for ${emailId} (Attempt ${currentAttempt}/${maxAttempts})`
      );

      // 1. Fetch current status from database to enforce idempotency
      const emailRecord = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!emailRecord) {
        logger.warn(`[Job ${job.id}] Email record ${emailId} not found in database. Skipping.`);
        return { skipped: true, reason: 'Record not found' };
      }

      // 2. Prevent sending if cancelled
      if (emailRecord.status === 'CANCELLED') {
        logger.warn(
          `[Job ${job.id}] Email ${emailId} was cancelled by user. Aborting delivery.`
        );
        return { skipped: true, reason: 'Cancelled' };
      }

      // 3. Prevent duplicate sending if already sent
      if (emailRecord.status === 'SENT') {
        logger.warn(
          `[Job ${job.id}] Email ${emailId} has already been marked as SENT. Skipping to prevent duplicate delivery.`
        );
        return { skipped: true, reason: 'Already sent' };
      }

      // 4. Mark status as PROCESSING
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'PROCESSING',
          attempts: currentAttempt,
        },
      });

      try {
        // 5. Deliver email via Ethereal SMTP
        const result = await smtpService.sendMail({
          to: recipient,
          subject,
          text: body,
          html: body,
        });

        const sentAt = new Date();

        // 6. Update database record on success
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt,
            previewUrl: result.previewUrl,
            errorMessage: null,
            attempts: currentAttempt,
          },
        });

        logger.success(
          `[Job ${job.id}] Email ${emailId} successfully sent! SentAt: ${sentAt.toISOString()} | Preview: ${result.previewUrl || 'N/A'}`
        );

        return {
          success: true,
          emailId,
          messageId: result.messageId,
          previewUrl: result.previewUrl,
        };
      } catch (error: any) {
        const errorMsg = error?.message || 'Unknown SMTP delivery error';
        const isFinalAttempt = currentAttempt >= maxAttempts;

        logger.error(
          `[Job ${job.id}] Delivery failed for email ${emailId} (Attempt ${currentAttempt}/${maxAttempts}): ${errorMsg}`
        );

        // Update database with failure information
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: isFinalAttempt ? 'FAILED' : 'PROCESSING',
            attempts: currentAttempt,
            errorMessage: `${errorMsg} (Attempt ${currentAttempt}/${maxAttempts})`,
          },
        });

        // Re-throw so BullMQ triggers retry backoff if attempts remain
        throw error;
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 5,
    }
  );

  worker.on('ready', () => {
    logger.success('Email worker process is ready and actively listening for jobs');
  });

  worker.on('active', (job) => {
    logger.info(`Job ${job.id} became active (delay expired)`);
  });

  worker.on('completed', (job, result) => {
    logger.success(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  worker.on('error', (err: any) => {
    if (err?.message?.includes('Connection is closed')) {
      return;
    }
    logger.error('Worker encountered an unexpected error:', err);
  });

  return worker;
};

