import { Worker } from 'bullmq';
import redis from '../redis.js';
import { upsertDailyUsage } from '../services/analytics.service.js';
import type { LogProcessingJob } from '../queues.js';

let worker: Worker | null = null;

export function startLogProcessorWorker() {
  worker = new Worker<LogProcessingJob>(
    'log-processing',
    async (job) => {
      const { projectId, model, totalTokens, costUsd, date } = job.data;

      await upsertDailyUsage(projectId, model, totalTokens, costUsd, date);

      return { processed: true };
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Log Processor] Job ${job?.id} failed:`, err.message);
  });

  console.log('✅ Log Processor worker started');
  return worker;
}

export function stopLogProcessorWorker() {
  return worker?.close();
}
