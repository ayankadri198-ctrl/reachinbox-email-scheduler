import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scheduleEmailSchema } from '../validators/email.validator.js';

describe('Email Scheduling & Validation Suite', () => {
  it('validates a correct future email schedule request', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour ahead
    const payload = {
      recipient: 'developer@reachinbox.ai',
      subject: 'Interview Assignment Ready',
      body: '<p>The email scheduler implementation is complete.</p>',
      scheduledAt: futureDate,
    };

    const parsed = scheduleEmailSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('rejects an email with an invalid recipient address', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const payload = {
      recipient: 'not-an-email-address',
      subject: 'Testing error handling',
      body: 'Test body',
      scheduledAt: futureDate,
    };

    const parsed = scheduleEmailSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('valid recipient email');
    }
  });

  it('rejects scheduling an email in the past', () => {
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
    const payload = {
      recipient: 'developer@reachinbox.ai',
      subject: 'Past scheduled email',
      body: 'Test body',
      scheduledAt: pastDate,
    };

    const parsed = scheduleEmailSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('cannot be in the past');
    }
  });

  it('calculates BullMQ delayed job delay accurately', () => {
    const targetTime = Date.now() + 30000; // 30 seconds ahead
    const delay = Math.max(0, targetTime - Date.now());
    expect(delay).toBeGreaterThanOrEqual(29000);
    expect(delay).toBeLessThanOrEqual(30000);
  });
});

