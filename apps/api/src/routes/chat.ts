import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import db from '../db.js';
import { type AuthenticatedRequest } from '../middleware/auth.js';
import { chat as llmChat, type ChatMessage } from '../services/llm.service.js';
import { retrieveRelevant } from '../services/memory.service.js';
import { shouldCompress, compress, saveCompressionSummary, estimateMessagesTokens } from '../services/compression.service.js';
import { evaluateRules, checkBudget } from '../services/routing.service.js';
import { resolveWithCanary } from '../services/prompt.service.js';
import { memoryExtractionQueue, logProcessingQueue } from '../queues.js';

const chatBodySchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
  sessionId: z.string().uuid().optional(),
  model: z.string().optional(),
  options: z.object({
    enableMemory: z.boolean().default(true),
    enableCompression: z.boolean().default(true),
    promptTemplateId: z.string().uuid().optional(),
    stream: z.boolean().default(false),
  }).optional(),
});

export default async function chatRoutes(fastify: FastifyInstance) {
  fastify.post('/chat', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const body = chatBodySchema.parse(request.body);
    const options = body.options || {};

    // 1. Find or create app user
    let appUser = await db('app_users')
      .where({ project_id: project.id, external_id: body.userId })
      .first();

    if (!appUser) {
      [appUser] = await db('app_users')
        .insert({ project_id: project.id, external_id: body.userId })
        .returning('*');
    }

    // 2. Find or create session
    let session;
    if (body.sessionId) {
      session = await db('sessions')
        .where({ id: body.sessionId, project_id: project.id })
        .first();
    }

    if (!session) {
      [session] = await db('sessions')
        .insert({ project_id: project.id, app_user_id: appUser.id })
        .returning('*');
    }

    // 3. Retrieve relevant memories (semantic search)
    let memories: any[] = [];
    let memoriesInjected = 0;
    if (options.enableMemory !== false) {
      try {
        memories = await retrieveRelevant(project.id, appUser.id, body.message, 5);
        memoriesInjected = memories.length;
      } catch (err: any) {
        console.error('Memory retrieval failed:', err.message);
      }
    }

    // 4. Load conversation history
    const history = await db('messages')
      .where({ session_id: session.id })
      .orderBy('created_at', 'asc');

    // 5. Build messages array
    const messages: ChatMessage[] = [];

    // System prompt (from template or default)
    let promptVersion: string | undefined;
    let promptVersionId: string | undefined;
    if (options.promptTemplateId) {
      const resolved = await resolveWithCanary(project.id, options.promptTemplateId);
      if (resolved) {
        messages.push({ role: 'system', content: resolved.content });
        promptVersion = resolved.version;
        promptVersionId = resolved.versionId;
      }
    }

    if (messages.length === 0) {
      messages.push({
        role: 'system',
        content: 'You are a helpful AI assistant. Be concise and helpful.',
      });
    }

    // Inject memories
    if (memories.length > 0) {
      const memoriesBlock = memories
        .map(m => `- ${m.content} (${m.category}, confidence: ${m.confidence})`)
        .join('\n');
      messages.push({
        role: 'system',
        content: `Memories about this user:\n${memoriesBlock}\n\nUse these memories to personalize your response when relevant.`,
      });
    }

    // Add history (possibly compressed)
    let wasCompressed = false;
    if (history.length > 0) {
      const historyMessages = history.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const settings = project.settings || {};
      const recentTurnsToKeep = settings.recentTurnsToKeep || 10;

      if (options.enableCompression !== false && shouldCompress(historyMessages)) {
        const compressed = await compress(historyMessages, recentTurnsToKeep);
        messages.push(...compressed.compressedMessages as ChatMessage[]);
        wasCompressed = compressed.wasCompressed;
        if (wasCompressed) {
          await saveCompressionSummary(session.id, compressed.summary);
        }
      } else {
        messages.push(...historyMessages);
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: body.message });

    // 6. Apply model routing rules
    const settings = project.settings || {};
    const targetModel = body.model || await evaluateRules(
      project.id,
      body.message,
      settings.defaultModel || 'gpt-4o-mini'
    );

    // 7. Check budget
    const budget = await checkBudget(project.id, appUser.id, settings.monthlyBudgetTokens);
    if (!budget.allowed) {
      return reply.code(429).send({
        error: 'Budget exceeded',
        message: `Monthly token budget of ${budget.limit} tokens exceeded. Used: ${budget.used}`,
      });
    }

    // 8. Call LLM
    const result = await llmChat(messages, targetModel);

    // 9. Save messages to DB
    const userMsgTokens = Math.ceil(body.message.length / 4);
    const assistantMsgTokens = Math.ceil(result.response.length / 4);

    await db('messages').insert([
      {
        session_id: session.id,
        role: 'user',
        content: body.message,
        token_count: userMsgTokens,
      },
      {
        session_id: session.id,
        role: 'assistant',
        content: result.response,
        token_count: assistantMsgTokens,
      },
    ]);

    // Update session
    await db('sessions')
      .where({ id: session.id })
      .update({
        turn_count: db.raw('turn_count + 2'),
        token_count: db.raw('token_count + ?', [result.totalTokens]),
        last_active_at: new Date().toISOString(),
      });

    // 10. Log call
    const [callLog] = await db('call_logs').insert({
      project_id: project.id,
      session_id: session.id,
      app_user_id: appUser.id,
      prompt_version_id: promptVersionId || null,
      model: result.model,
      messages_payload: JSON.stringify(messages),
      response_payload: JSON.stringify({ response: result.response }),
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      total_tokens: result.totalTokens,
      latency_ms: result.latencyMs,
      cost_usd: result.costUsd,
    }).returning('id');

    // 11. Enqueue background jobs (non-blocking)
    if (options.enableMemory !== false) {
      memoryExtractionQueue.add('extract', {
        projectId: project.id,
        appUserId: appUser.id,
        sessionId: session.id,
        userMessage: body.message,
        assistantResponse: result.response,
      }).catch(() => {});
    }

    logProcessingQueue.add('process', {
      projectId: project.id,
      model: result.model,
      totalTokens: result.totalTokens,
      costUsd: result.costUsd,
      date: new Date().toISOString().split('T')[0],
    }).catch(() => {});

    // 12. Return response
    return reply.send({
      response: result.response,
      sessionId: session.id,
      usage: {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        model: result.model,
        costUsd: result.costUsd,
      },
      debug: {
        memoriesInjected,
        wasCompressed,
        promptVersion: promptVersion || null,
      },
    });
  });
}
