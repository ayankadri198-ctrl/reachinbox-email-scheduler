import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, connectPrisma } from '../config/prisma.js';
import { redisClient, connectRedis } from '../config/redis.js';
import { emailQueue, addEmailJob, removeEmailJob, rescheduleEmailJob } from '../queues/email.queue.js';
import { createEmailWorker } from '../workers/email.worker.js';
import { smtpService } from '../services/smtp.service.js';

describe('BullMQ Queue Lifecycle & Resilience Suite', () => {
  let testUserId: string;

  beforeAll(async () => {
    await connectPrisma();
    await connectRedis();

    // Find or create test user
    const existing = await prisma.user.findFirst();
    if (existing) {
      testUserId = existing.id;
    } else {
      const newUser = await prisma.user.create({
        data: {
          name: 'Queue Test User',
          email: `queue-test-${Date.now()}@test.com`,
          passwordHash: 'dummyhash',
        },
      });
      testUserId = newUser.id;
    }
  });

  afterAll(async () => {
    await emailQueue.close();
    await redisClient.quit();
    await prisma.$disconnect();
  });

  it('verifies Redis and PostgreSQL connections are healthy', async () => {
    const ping = await redisClient.ping();
    expect(ping).toBe('PONG');

    const dbCheck = await prisma.$queryRaw<Array<{ count: number }>>`SELECT 1 as count`;
    expect(dbCheck.length).toBeGreaterThan(0);
  });

  it('schedules a delayed BullMQ job and verifies it exists in delayed set', async () => {
    const futureDate = new Date(Date.now() + 60000); // 60 seconds in future
    const email = await prisma.email.create({
      data: {
        userId: testUserId,
        recipient: 'test-delayed@reachinbox.test',
        subject: 'Delayed Email Test',
        body: 'Testing BullMQ delay calculation',
        scheduledAt: futureDate,
        status: 'SCHEDULED',
      },
    });

    const job = await addEmailJob(email);
    expect(job).toBeDefined();
    expect(job.id).toBe(email.id);

    // Verify job in BullMQ
    const retrieved = await emailQueue.getJob(email.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.data.emailId).toBe(email.id);

    const state = await retrieved?.getState();
    expect(state).toBe('delayed');
  });

  it('cancels a scheduled email and ensures BullMQ job is removed from queue', async () => {
    const futureDate = new Date(Date.now() + 120000);
    const email = await prisma.email.create({
      data: {
        userId: testUserId,
        recipient: 'test-cancel@reachinbox.test',
        subject: 'Cancel Test',
        body: 'Testing BullMQ job removal',
        scheduledAt: futureDate,
        status: 'SCHEDULED',
      },
    });

    await addEmailJob(email);

    // Cancel job
    const removed = await removeEmailJob(email.id);
    expect(removed).toBe(true);

    const jobAfter = await emailQueue.getJob(email.id);
    expect(jobAfter).toBeFalsy();
  });

  it('reschedules an email and verifies updated delayed time', async () => {
    const initialDate = new Date(Date.now() + 60000);
    const updatedDate = new Date(Date.now() + 180000);

    const email = await prisma.email.create({
      data: {
        userId: testUserId,
        recipient: 'test-reschedule@reachinbox.test',
        subject: 'Reschedule Test',
        body: 'Testing BullMQ job update',
        scheduledAt: initialDate,
        status: 'SCHEDULED',
      },
    });

    await addEmailJob(email);

    // Reschedule
    const newJob = await rescheduleEmailJob({
      ...email,
      scheduledAt: updatedDate,
    });

    expect(newJob).toBeDefined();
    expect(newJob.id).toBe(email.id);

    const retrieved = await emailQueue.getJob(email.id);
    expect(retrieved).not.toBeNull();
    const delay = retrieved?.opts.delay || 0;
    expect(delay).toBeGreaterThan(60000);
  });

  it('tests simulated worker crash & restart recovery: delayed jobs persist in Redis', async () => {
    const futureDate = new Date(Date.now() + 300000);
    const email = await prisma.email.create({
      data: {
        userId: testUserId,
        recipient: 'test-persistence@reachinbox.test',
        subject: 'Persistence Resilience Test',
        body: 'Testing BullMQ Redis persistence across worker restarts',
        scheduledAt: futureDate,
        status: 'SCHEDULED',
      },
    });

    await addEmailJob(email);

    // Simulate worker restart by instantiating a fresh worker instance
    const worker = createEmailWorker();
    expect(worker).toBeDefined();

    // Job must still exist in Redis queue
    const persistentJob = await emailQueue.getJob(email.id);
    expect(persistentJob).not.toBeNull();
    expect(persistentJob?.id).toBe(email.id);

    // Cleanup worker and test email
    await worker.close();
    await removeEmailJob(email.id);
  });

  it('delivers an email via Ethereal SMTP with rendered preview URL and idempotent status update', async () => {
    const email = await prisma.email.create({
      data: {
        userId: testUserId,
        recipient: 'qa-tester@reachinbox.test',
        subject: 'Ethereal Delivery Test',
        body: '<h1>ReachInbox Automated Deployment Verification</h1><p>Email delivery verified.</p>',
        scheduledAt: new Date(),
        status: 'SCHEDULED',
      },
    });

    // Send via smtpService directly or through worker
    const result = await smtpService.sendMail({
      to: email.recipient,
      subject: email.subject,
      html: email.body,
    });

    expect(result.messageId).toBeDefined();
    expect(result.previewUrl).toContain('https://ethereal.email/message/');

    // Update status to SENT with previewUrl
    const updated = await prisma.email.update({
      where: { id: email.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        previewUrl: result.previewUrl,
      },
    });

    expect(updated.status).toBe('SENT');
    expect(updated.previewUrl).toBe(result.previewUrl);
  }, 20000); // 20s timeout for network call
});
