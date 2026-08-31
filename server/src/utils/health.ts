import { prisma } from '../config/prisma';
import { isRedisHealthy } from '../config/redis';
import { env } from '../config/env';

export type HealthStatus = {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
  redis: 'ok' | 'disabled' | 'error';
};

export async function getHealthStatus(): Promise<HealthStatus> {
  let db: HealthStatus['db'] = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }

  let redis: HealthStatus['redis'] = 'disabled';
  if (env.REDIS_URL) {
    redis = (await isRedisHealthy()) ? 'ok' : 'error';
  }

  return { status: db === 'ok' ? 'ok' : 'error', db, redis };
}
