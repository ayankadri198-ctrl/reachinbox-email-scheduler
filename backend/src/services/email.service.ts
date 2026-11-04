import { prisma } from '../config/prisma.js';
import { addEmailJob, removeEmailJob, rescheduleEmailJob } from '../queues/email.queue.js';
import { ScheduleEmailInput, UpdateEmailInput, EmailQueryInput } from '../validators/email.validator.js';
import { EmailStatus, Prisma } from '@prisma/client';

class EmailService {
  async scheduleEmail(userId: string, input: ScheduleEmailInput) {
    const scheduledDate = new Date(input.scheduledAt);

    // 1. Create email in PostgreSQL with SCHEDULED status
    const email = await prisma.email.create({
      data: {
        userId,
        recipient: input.recipient.toLowerCase().trim(),
        subject: input.subject.trim(),
        body: input.body,
        scheduledAt: scheduledDate,
        status: EmailStatus.SCHEDULED,
      },
    });

    // 2. Add delayed job to BullMQ
    try {
      const job = await addEmailJob({
        id: email.id,
        userId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        scheduledAt: email.scheduledAt,
      });

      // 3. Update email record with BullMQ Job ID
      const updated = await prisma.email.update({
        where: { id: email.id },
        data: {
          bullJobId: String(job.id),
        },
      });

      return updated;
    } catch (error) {
      // If queueing fails, mark email as FAILED in DB and throw
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: EmailStatus.FAILED,
          errorMessage: 'Failed to enqueue delayed job in Redis',
        },
      });
      throw error;
    }
  }

  async updateEmail(userId: string, emailId: string, input: UpdateEmailInput) {
    const email = await prisma.email.findFirst({
      where: { id: emailId, userId },
    });

    if (!email) {
      const error: any = new Error('Email not found');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (email.status !== EmailStatus.SCHEDULED) {
      const error: any = new Error(
        `Cannot edit an email with status "${email.status}". Only SCHEDULED emails can be modified.`
      );
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const newScheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : email.scheduledAt;

    // Update in database
    const updated = await prisma.email.update({
      where: { id: emailId },
      data: {
        recipient: input.recipient ? input.recipient.toLowerCase().trim() : undefined,
        subject: input.subject ? input.subject.trim() : undefined,
        body: input.body !== undefined ? input.body : undefined,
        scheduledAt: newScheduledAt,
      },
    });

    // Reschedule in BullMQ
    await rescheduleEmailJob({
      id: updated.id,
      userId: updated.userId,
      recipient: updated.recipient,
      subject: updated.subject,
      body: updated.body,
      scheduledAt: updated.scheduledAt,
    });

    return updated;
  }

  async cancelEmail(userId: string, emailId: string) {
    const email = await prisma.email.findFirst({
      where: { id: emailId, userId },
    });

    if (!email) {
      const error: any = new Error('Email not found');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (email.status !== EmailStatus.SCHEDULED) {
      const error: any = new Error(
        `Cannot cancel an email with status "${email.status}". Only SCHEDULED emails can be cancelled.`
      );
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // 1. Remove from BullMQ queue
    await removeEmailJob(email.bullJobId || email.id);

    // 2. Mark as CANCELLED in database
    const cancelled = await prisma.email.update({
      where: { id: emailId },
      data: {
        status: EmailStatus.CANCELLED,
      },
    });

    return cancelled;
  }

  async retryEmail(userId: string, emailId: string) {
    const email = await prisma.email.findFirst({
      where: { id: emailId, userId },
    });

    if (!email) {
      const error: any = new Error('Email not found');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (email.status !== EmailStatus.FAILED) {
      const error: any = new Error(
        `Only FAILED emails can be retried. Current status is "${email.status}".`
      );
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // Reset status to SCHEDULED, schedule immediate BullMQ job (1s delay)
    const scheduledAt = new Date(Date.now() + 1000);

    const updated = await prisma.email.update({
      where: { id: emailId },
      data: {
        status: EmailStatus.SCHEDULED,
        scheduledAt,
        attempts: 0,
        errorMessage: null,
      },
    });

    await rescheduleEmailJob({
      id: updated.id,
      userId: updated.userId,
      recipient: updated.recipient,
      subject: updated.subject,
      body: updated.body,
      scheduledAt: updated.scheduledAt,
    });

    return updated;
  }

  async getEmails(userId: string, query: EmailQueryInput) {
    const { page, limit, status, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailWhereInput = {
      userId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { recipient: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getEmailById(userId: string, emailId: string) {
    const email = await prisma.email.findFirst({
      where: { id: emailId, userId },
    });

    if (!email) {
      const error: any = new Error('Email not found');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    return email;
  }

  async getDashboardStats(userId: string) {
    const [total, scheduled, sent, failed, cancelled] = await Promise.all([
      prisma.email.count({ where: { userId } }),
      prisma.email.count({ where: { userId, status: EmailStatus.SCHEDULED } }),
      prisma.email.count({ where: { userId, status: EmailStatus.SENT } }),
      prisma.email.count({ where: { userId, status: EmailStatus.FAILED } }),
      prisma.email.count({ where: { userId, status: EmailStatus.CANCELLED } }),
    ]);

    const completedAttempts = sent + failed;
    const successRate = completedAttempts > 0 ? Number(((sent / completedAttempts) * 100).toFixed(1)) : 100;

    // Upcoming in next 24 hours
    const now = new Date();
    const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const upcoming24h = await prisma.email.count({
      where: {
        userId,
        status: EmailStatus.SCHEDULED,
        scheduledAt: {
          gte: now,
          lte: next24h,
        },
      },
    });

    return {
      total,
      scheduled,
      sent,
      failed,
      cancelled,
      successRate,
      upcoming24h,
    };
  }

  async getDashboardActivity(userId: string, days = 7) {
    // Generate dates for the past `days` days
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0);
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);

      const [scheduledCount, sentCount, failedCount] = await Promise.all([
        prisma.email.count({
          where: {
            userId,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.email.count({
          where: {
            userId,
            status: EmailStatus.SENT,
            sentAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        prisma.email.count({
          where: {
            userId,
            status: EmailStatus.FAILED,
            updatedAt: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      const label = dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      result.push({
        date: label,
        isoDate: dayStart.toISOString().split('T')[0],
        scheduled: scheduledCount,
        sent: sentCount,
        failed: failedCount,
      });
    }

    return result;
  }
}

export const emailService = new EmailService();

