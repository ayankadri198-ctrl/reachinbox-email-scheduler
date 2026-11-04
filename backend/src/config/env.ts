import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5001),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/reachinbox?schema=public'),
  
  // Redis configuration
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_URL: z.string().optional(),

  // JWT configuration
  JWT_SECRET: z.string().default('reachinbox-super-secret-jwt-key-2025'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Frontend URL for CORS
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Nodemailer / Ethereal SMTP configuration
  SMTP_HOST: z.string().optional().default('smtp.ethereal.email'),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('"ReachInbox Scheduler" <scheduler@reachinbox.test>'),
  ETHEREAL_AUTO_CREATE: z.coerce.boolean().default(true),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Environment configuration error');
  }
  return result.data;
};

export const env = parseEnv();

