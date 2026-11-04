import { PrismaClient, EmailStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database for ReachInbox Email Scheduler...');

  // 1. Create or update demo user
  const demoEmail = 'demo@reachinbox.test';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('reachinbox123', salt);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      passwordHash,
    },
    create: {
      name: 'Demo Reviewer',
      email: demoEmail,
      passwordHash,
    },
  });

  console.log(`👤 User ready: ${user.email} (Password: reachinbox123)`);

  // 2. Clear existing emails for demo user to ensure clean seed
  await prisma.email.deleteMany({
    where: { userId: user.id },
  });

  const now = new Date();

  // 3. Seed some historical sent emails
  const sentEmails = [
    {
      userId: user.id,
      recipient: 'alex.morgan@outboxlabs.com',
      subject: 'Interview Assignment: Full-Stack Smart Email Scheduler Architecture',
      body: '<p>Hi Alex,</p><p>We are delighted to share the complete Full-Stack Email Scheduler implementation adhering to all requirements: BullMQ persistent queue, dedicated background worker, and Ethereal SMTP delivery.</p><p>Best regards,<br/>ReachInbox Team</p>',
      scheduledAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      sentAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 400),
      status: EmailStatus.SENT,
      bullJobId: 'seed-job-1',
      attempts: 1,
      previewUrl: 'https://ethereal.email/message/XxYyZz1234567890',
    },
    {
      userId: user.id,
      recipient: 'founder@saas-startup.io',
      subject: 'Weekly Delivery Telemetry & Analytics Report',
      body: '<h3>System Status: 100% Operational</h3><p>All BullMQ scheduled jobs survived recent worker restarts with zero dropped messages.</p>',
      scheduledAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      sentAt: new Date(now.getTime() - 18 * 60 * 60 * 1000 + 350),
      status: EmailStatus.SENT,
      bullJobId: 'seed-job-2',
      attempts: 1,
      previewUrl: 'https://ethereal.email/message/AaBbCc9876543210',
    },
    {
      userId: user.id,
      recipient: 'growth@reachinbox.ai',
      subject: 'Cold Outreach Sequence #1: Automated Follow-up',
      body: '<p>Hey team,</p><p>Checking in on our Q4 pipeline automation performance. Looking solid across all accounts!</p>',
      scheduledAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      sentAt: new Date(now.getTime() - 26 * 60 * 60 * 1000 + 500),
      status: EmailStatus.SENT,
      bullJobId: 'seed-job-3',
      attempts: 1,
      previewUrl: 'https://ethereal.email/message/DemoPreviewUrl123',
    },
  ];

  for (const item of sentEmails) {
    await prisma.email.create({ data: item });
  }

  // 4. Seed an upcoming scheduled email
  await prisma.email.create({
    data: {
      userId: user.id,
      recipient: 'product@outboxlabs.com',
      subject: 'Production Rollout Checkpoint & Performance Metrics',
      body: '<p>Hello Team,</p><p>This email is scheduled to dispatch automatically once the BullMQ delay duration elapses.</p>',
      scheduledAt: new Date(now.getTime() + 45 * 60 * 1000), // 45 mins in future
      status: EmailStatus.SCHEDULED,
      bullJobId: 'seed-job-scheduled-1',
      attempts: 0,
    },
  });

  // 5. Seed a failed email for demonstration of retry mechanism
  await prisma.email.create({
    data: {
      userId: user.id,
      recipient: 'invalid-mx-record@unreachable-domain-test.xyz',
      subject: 'Urgent: MX record failure simulation',
      body: '<p>Testing error handling and retry mechanisms on unreachable SMTP destinations.</p>',
      scheduledAt: new Date(now.getTime() - 30 * 60 * 1000),
      status: EmailStatus.FAILED,
      bullJobId: 'seed-job-failed-1',
      attempts: 3,
      errorMessage: 'SMTP connection timeout: getaddrinfo ENOTFOUND unreachable-domain-test.xyz (Attempt 3/3)',
    },
  });

  console.log('✅ Database seeded with demo statistics and records successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

