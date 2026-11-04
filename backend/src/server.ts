import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectPrisma, prisma } from './config/prisma.js';
import { connectRedis, redisClient } from './config/redis.js';
import { Logger } from './utils/logger.js';

const logger = new Logger('ServerBootstrap');

async function bootstrap() {
  logger.info('====================================================');
  logger.info('        REACHINBOX EMAIL SCHEDULER API SERVER       ');
  logger.info('====================================================');

  try {
    // 1. Initialize DB and Redis
    await connectPrisma();
    await connectRedis();

    // 2. Start Express app
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.success(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`📡 API endpoint: http://localhost:${env.PORT}/api`);
      logger.info(`🩺 Health check: http://localhost:${env.PORT}/health`);
    });

    // 3. Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down API server gracefully...`);
      server.close(async () => {
        try {
          await redisClient.quit();
          await prisma.$disconnect();
          logger.success('All server connections closed cleanly.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force shutdown after 10s if hanging
      setTimeout(() => {
        logger.error('Forcefully terminating process after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Fatal bootstrap error:', error);
    process.exit(1);
  }
}

bootstrap();

