import { startMemoryExtractorWorker } from './memory-extractor.worker.js';
import { startLogProcessorWorker } from './log-processor.worker.js';

export function startWorkers() {
  try {
    startMemoryExtractorWorker();
    startLogProcessorWorker();
    console.log('✅ All workers started');
  } catch (err: any) {
    console.error('⚠️  Worker startup failed:', err.message);
    console.warn('   Background jobs will not process');
  }
}
