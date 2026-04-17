import { Queue } from 'bullmq';
import redis from './redis.js';

export const memoryExtractionQueue = new Queue('memory-extraction', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export const logProcessingQueue = new Queue('log-processing', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export interface MemoryExtractionJob {
  projectId: string;
  appUserId: string;
  sessionId: string;
  userMessage: string;
  assistantResponse: string;
}

export interface LogProcessingJob {
  projectId: string;
  model: string;
  totalTokens: number;
  costUsd: number;
  date: string;
}
