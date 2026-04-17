import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { initQdrant } from './qdrant.js';
import { authMiddleware } from './middleware/auth.js';

// Routes
import chatRoutes from './routes/chat.js';
import memoryRoutes from './routes/memories.js';
import sessionRoutes from './routes/sessions.js';
import promptRoutes from './routes/prompts.js';
import analyticsRoutes from './routes/analytics.js';

// Workers
import { startWorkers } from './workers/index.js';

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
});

async function start() {
  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Health check (no auth)
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // API info (no auth)
  app.get('/', async () => ({
    name: 'ContextOS API',
    version: '0.1.0',
    description: 'The memory layer for LLM apps',
    docs: 'https://docs.contextos.dev',
  }));

  // Register auth middleware for /v1/* routes
  app.register(async (v1) => {
    v1.addHook('preHandler', authMiddleware);
    await v1.register(chatRoutes);
    await v1.register(memoryRoutes);
    await v1.register(sessionRoutes);
    await v1.register(promptRoutes);
    await v1.register(analyticsRoutes);
  }, { prefix: '/v1' });

  // Initialize Qdrant collection
  await initQdrant();

  // Start background workers
  startWorkers();

  // Start server
  await app.listen({
    port: config.API_PORT,
    host: config.API_HOST,
  });

  console.log(`
  ╔═══════════════════════════════════════════╗
  ║         ContextOS API Server              ║
  ║   http://${config.API_HOST}:${config.API_PORT}                  ║
  ║                                           ║
  ║   Endpoints:                              ║
  ║   POST   /v1/chat                         ║
  ║   GET    /v1/memories                     ║
  ║   POST   /v1/memories                     ║
  ║   GET    /v1/sessions                     ║
  ║   GET    /v1/prompts                      ║
  ║   GET    /v1/analytics/usage              ║
  ║   GET    /health                          ║
  ╚═══════════════════════════════════════════╝
  `);
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'] as const;
for (const signal of signals) {
  process.on(signal, async () => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await app.close();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
