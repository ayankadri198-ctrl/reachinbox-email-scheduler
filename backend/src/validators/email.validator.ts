import { z } from 'zod';

export const scheduleEmailSchema = z.object({
  recipient: z.string().email('Please enter a valid recipient email address'),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject cannot exceed 255 characters'),
  body: z.string().min(1, 'Email body is required'),
  scheduledAt: z
    .string()
    .datetime({ message: 'scheduledAt must be a valid ISO-8601 datetime string' })
    .refine(
      (val) => {
        const scheduledTime = new Date(val).getTime();
        // Allow minimum 2 seconds in future to account for latency
        return scheduledTime > Date.now() - 2000;
      },
      {
        message: 'Scheduled date and time cannot be in the past',
      }
    ),
  timezone: z.string().optional(),
});

export const updateEmailSchema = z.object({
  recipient: z.string().email('Please enter a valid recipient email address').optional(),
  subject: z.string().min(1, 'Subject cannot be empty').max(255).optional(),
  body: z.string().min(1, 'Email body cannot be empty').optional(),
  scheduledAt: z
    .string()
    .datetime({ message: 'scheduledAt must be a valid ISO-8601 datetime string' })
    .refine(
      (val) => {
        const scheduledTime = new Date(val).getTime();
        return scheduledTime > Date.now() - 2000;
      },
      {
        message: 'Rescheduled date and time cannot be in the past',
      }
    )
    .optional(),
  timezone: z.string().optional(),
});

export const emailQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['scheduledAt', 'createdAt', 'sentAt']).default('scheduledAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
export type EmailQueryInput = z.infer<typeof emailQuerySchema>;

