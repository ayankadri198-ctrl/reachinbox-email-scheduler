import { createEmailWorker } from './workers/email.worker.js';
import { connectPrisma, prisma } from './config/prisma.js';
import { connectRedis, redisClient } from './config/redis.js';
import { Logger } from './utils/logger.js';

const logger = new Logger('WorkerBootstrap');

async function startWorker() {
  logger.info('====================================================');
  logger.info('   REACHINBOX DEDICATED BACKGROUND EMAIL WORKER     ');
  logger.info('====================================================');

  try {
    // 1. Verify Prisma / PostgreSQL connection
    await connectPrisma();

    // 2. Verify Redis connection
    await connectRedis();

    // 3. Start BullMQ worker
    const worker = createEmailWorker();

    logger.success('Worker initialized and waiting for delayed BullMQ jobs...');

    // 4. Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down worker gracefully...`);
      try {
        await worker.close();
        await redisClient.quit();
        await prisma.$disconnect();
        logger.success('Worker shutdown complete.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during worker shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Failed to start email worker:', error);
    process.exit(1);
  }
}

startWorker();

