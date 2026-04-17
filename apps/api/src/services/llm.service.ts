import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config, isMockMode } from '../config.js';
import crypto from 'crypto';

// Cost per 1M tokens (approximate)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
};

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

if (config.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
}
if (config.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  response: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
}

/**
 * Unified chat interface: calls real LLM or returns mock response
 */
export async function chat(
  messages: ChatMessage[],
  model: string = config.DEFAULT_MODEL,
  stream: boolean = false
): Promise<ChatResult> {
  const startTime = Date.now();

  if (isMockMode) {
    return mockChat(messages, model, startTime);
  }

  const provider = getProvider(model);

  if (provider === 'openai' && openaiClient) {
    return openaiChat(openaiClient, messages, model, startTime);
  } else if (provider === 'anthropic' && anthropicClient) {
    return anthropicChat(anthropicClient, messages, model, startTime);
  }

  // Fallback to mock if provider key missing
  return mockChat(messages, model, startTime);
}

/**
 * Generate embedding vector for text
 */
export async function embed(text: string): Promise<number[]> {
  if (isMockMode || !openaiClient) {
    return mockEmbed(text);
  }

  const response = await openaiClient.embeddings.create({
    model: config.EMBEDDING_MODEL,
    input: text,
    dimensions: config.EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Calculate cost for token usage
 */
export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 1, output: 3 };
  return (promptTokens * costs.input + completionTokens * costs.output) / 1_000_000;
}

// --- Provider implementations ---

async function openaiChat(client: OpenAI, messages: ChatMessage[], model: string, startTime: number): Promise<ChatResult> {
  const response = await client.chat.completions.create({
    model,
    messages,
  });

  const latencyMs = Date.now() - startTime;
  const choice = response.choices[0];
  const promptTokens = response.usage?.prompt_tokens || 0;
  const completionTokens = response.usage?.completion_tokens || 0;

  return {
    response: choice.message.content || '',
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: calculateCost(model, promptTokens, completionTokens),
    latencyMs,
  };
}

async function anthropicChat(client: Anthropic, messages: ChatMessage[], model: string, startTime: number): Promise<ChatResult> {
  // Extract system message
  const systemMsg = messages.find(m => m.role === 'system');
  const nonSystemMsgs = messages.filter(m => m.role !== 'system');

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemMsg?.content || '',
    messages: nonSystemMsgs.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  const latencyMs = Date.now() - startTime;
  const promptTokens = response.usage.input_tokens;
  const completionTokens = response.usage.output_tokens;

  return {
    response: response.content[0].type === 'text' ? response.content[0].text : '',
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: calculateCost(model, promptTokens, completionTokens),
    latencyMs,
  };
}

// --- Mock implementations ---

function mockChat(messages: ChatMessage[], model: string, startTime: number): ChatResult {
  const userMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
  const memories = messages.find(m => m.role === 'system' && m.content.includes('Memories:'));

  // Generate contextual mock responses
  let response: string;
  if (userMsg.toLowerCase().includes('name')) {
    response = memories
      ? "Based on my memory, your name is Alex! How can I help you today?"
      : "I don't think you've told me your name yet. What should I call you?";
  } else if (userMsg.toLowerCase().includes('help')) {
    response = "I'm here to help! I can assist you with questions, remember your preferences, and provide personalized responses. What would you like to know?";
  } else if (userMsg.toLowerCase().includes('preference')) {
    response = "I've noted your preferences and will keep them in mind for our future conversations. Is there anything specific you'd like me to remember?";
  } else {
    response = `I understand your message. [MOCK MODE] This is a simulated response for: "${userMsg.slice(0, 50)}${userMsg.length > 50 ? '...' : ''}"`;
  }

  // Simulate realistic token counts
  const promptTokens = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  const completionTokens = Math.ceil(response.length / 4);

  return {
    response,
    model: `${model} (mock)`,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: calculateCost(model, promptTokens, completionTokens),
    latencyMs: Date.now() - startTime + Math.floor(Math.random() * 200) + 100, // simulated latency
  };
}

function mockEmbed(text: string): number[] {
  // Deterministic pseudo-random vector based on text content
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  const vector: number[] = [];
  for (let i = 0; i < config.EMBEDDING_DIMENSIONS; i++) {
    const idx = (i * 2) % hash.length;
    const val = parseInt(hash.slice(idx, idx + 4), 16) / 65536;
    vector.push(val * 2 - 1); // normalize to [-1, 1]
  }
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / magnitude);
}

function getProvider(model: string): 'openai' | 'anthropic' {
  if (model.includes('claude')) return 'anthropic';
  return 'openai';
}
