import * as Sentry from '@sentry/node';
import { env } from './env';

export function initSentry() {
  if (!env.SENTRY_DSN) return;
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
}

export { Sentry };
