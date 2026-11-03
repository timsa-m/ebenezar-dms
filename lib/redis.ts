import * as dotenv from 'dotenv';
dotenv.config();

import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times) => {
    // Progressive backoff (up to 30s) when Redis is offline to reduce socket churn and CPU load
    return Math.min(times * 500, 30000);
  },
  enableOfflineQueue: false, // Don't build up infinite in-memory buffer if Redis is offline
});

let hasLoggedRefusal = false;

redisConnection.on('error', (err: any) => {
  // Rate-limit connection refused warnings so console remains readable during local development
  if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
    if (!hasLoggedRefusal) {
      console.warn(`[Redis] ℹ️ Optional Redis offline at ${REDIS_URL}. Continuing in local mode.`);
      hasLoggedRefusal = true;
    }
  } else {
    console.error('[Redis] Connection Error:', err);
  }
});

redisConnection.on('connect', () => {
  hasLoggedRefusal = false;
  console.log('[Redis] ✅ Connected to:', REDIS_URL);
});

export { redisConnection };
