import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  // Se Redis não está configurado, retorna null (graceful degradation)
  if (!env.REDIS_URL) {
    return null;
  }

  // Se já existe cliente, retorna o mesmo
  if (redis) {
    return redis;
  }

  try {
    redis = new Redis(env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      enableOfflineQueue: false
    });

    redis.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    return redis;
  } catch (error) {
    logger.error({ err: error }, 'Failed to create Redis client');
    return null;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export async function isRedisHealthy(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
