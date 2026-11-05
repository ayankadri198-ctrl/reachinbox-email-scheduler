import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { env } from './config/env.js';
import { redisClient } from './config/redis.js';
import { prisma } from './config/prisma.js';

export const createApp = (): Application => {
  const app = express();

  // Security and utilities middleware
  app.use(helmet());

  const allowedOrigins = [
    env.FRONTEND_URL,
    env.FRONTEND_URL?.replace(/\/$/, ''),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  // Also support comma-separated origins if provided in FRONTEND_URL
  if (env.FRONTEND_URL && env.FRONTEND_URL.includes(',')) {
    env.FRONTEND_URL.split(',').forEach((url) => {
      const trimmed = url.trim().replace(/\/$/, '');
      if (trimmed && !allowedOrigins.includes(trimmed)) {
        allowedOrigins.push(trimmed);
      }
    });
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server, health checks)
        if (!origin) return callback(null, true);

        const cleanOrigin = origin.replace(/\/$/, '');

        // Match predefined or configured origins
        if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Allow any Render-hosted subdomain (*.onrender.com) for production or PR previews
        if (/^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/.test(cleanOrigin)) {
          return callback(null, true);
        }

        // Allow any Vercel-hosted deployment (*.vercel.app) for production or preview branches
        if (/^https:\/\/[a-zA-Z0-9-._]+\.vercel\.app$/.test(cleanOrigin)) {
          return callback(null, true);
        }

        // Allow localhost on any port for local development
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
          return callback(null, true);
        }

        return callback(new Error(`CORS error: Origin ${origin} not allowed by Access-Control-Allow-Origin`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Healthcheck endpoint
  app.get('/health', async (_req: Request, res: Response) => {
    let dbStatus = 'healthy';
    let redisStatus = 'healthy';

    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000)),
      ]);
    } catch {
      dbStatus = 'unhealthy';
    }

    try {
      const ping = await Promise.race([
        redisClient.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis Timeout')), 3000)),
      ]);
      if (ping !== 'PONG') redisStatus = 'degraded';
    } catch {
      redisStatus = 'unhealthy';
    }

    const isHealthy = dbStatus === 'healthy' && redisStatus === 'healthy';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    });
  });

  // API Routes
  app.use('/api', apiRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
export default app;

