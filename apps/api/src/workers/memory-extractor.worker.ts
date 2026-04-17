import { Worker } from 'bullmq';
import redis from '../redis.js';
import { extractMemories } from '../services/memory.service.js';
import type { MemoryExtractionJob } from '../queues.js';

let worker: Worker | null = null;

export function startMemoryExtractorWorker() {
  worker = new Worker<MemoryExtractionJob>(
    'memory-extraction',
    async (job) => {
      const { projectId, appUserId, sessionId, userMessage, assistantResponse } = job.data;

      console.log(`[Memory Extractor] Processing job ${job.id} for session ${sessionId}`);

      const memories = await extractMemories(
        projectId,
        appUserId,
        sessionId,
        userMessage,
        assistantResponse
      );

      console.log(`[Memory Extractor] Extracted ${memories.length} memories from session ${sessionId}`);

      return { memoriesExtracted: memories.length };
    },
    {
      connection: redis,
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Memory Extractor] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Memory Extractor] Job ${job?.id} failed:`, err.message);
  });

  console.log('✅ Memory Extractor worker started');
  return worker;
}

export function stopMemoryExtractorWorker() {
  return worker?.close();
}
