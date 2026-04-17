import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/contextos'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  QDRANT_URL: z.string().default('http://localhost:6333'),

  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),

  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),

  JWT_SECRET: z.string().default('contextos-dev-secret'),
  DEFAULT_MODEL: z.string().default('gpt-4o-mini'),
  DEFAULT_PROVIDER: z.string().default('openai'),
});

export const config = envSchema.parse(process.env);

export const isMockMode = !config.OPENAI_API_KEY && !config.ANTHROPIC_API_KEY;

if (isMockMode) {
  console.warn('⚠️  [MOCK MODE] No LLM API keys found. Using mock responses.');
}
