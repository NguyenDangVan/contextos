#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_URL = process.env.CONTEXTOS_API_URL || 'http://localhost:3005';
const API_KEY = process.env.CONTEXTOS_API_KEY || 'ctx_demo_key_2026_hackathon_testsprite';

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${API_URL}/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`ContextOS API error ${res.status}: ${(err as any).message || res.statusText}`);
  }

  return res.json() as T;
}

const server = new McpServer({
  name: 'contextos',
  version: '0.1.0',
});

// ──────────────────────────────────────────────
// Tool 1: contextos_chat
// ──────────────────────────────────────────────
server.tool(
  'contextos_chat',
  'Chat with persistent memory. Sends a message through ContextOS which automatically injects relevant memories, compresses context, and extracts new facts from the conversation.',
  {
    userId: z.string().describe('Unique user identifier to track memories and sessions'),
    message: z.string().describe('The message to send'),
    sessionId: z.string().optional().describe('Optional session ID to continue a conversation'),
  },
  async ({ userId, message, sessionId }) => {
    const result = await apiRequest<any>('POST', '/chat', {
      userId,
      message,
      sessionId,
    });

    const lines = [
      `**AI Response:** ${result.response}`,
      '',
      `**Session:** ${result.sessionId}`,
      `**Model:** ${result.usage?.model || 'unknown'}`,
      `**Tokens:** ${result.usage?.totalTokens || 0} (prompt: ${result.usage?.promptTokens || 0}, completion: ${result.usage?.completionTokens || 0})`,
      `**Cost:** $${result.usage?.costUsd?.toFixed(6) || '0.000000'}`,
      `**Memories injected:** ${result.debug?.memoriesInjected || 0}`,
      `**Context compressed:** ${result.debug?.wasCompressed ? 'Yes' : 'No'}`,
    ];

    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  }
);

// ──────────────────────────────────────────────
// Tool 2: contextos_remember
// ──────────────────────────────────────────────
server.tool(
  'contextos_remember',
  'Store a memory or fact about a user in ContextOS. Memories are automatically retrieved and injected into future conversations for personalization.',
  {
    userId: z.string().describe('User identifier to associate the memory with'),
    content: z.string().describe('The fact or memory to store (e.g., "Prefers dark mode", "Name is Alex")'),
    category: z.string().optional().describe('Optional category: "preference", "fact", "context", or custom'),
  },
  async ({ userId, content, category }) => {
    const result = await apiRequest<any>('POST', '/memories', {
      userId,
      content,
      category,
    });

    return {
      content: [{
        type: 'text' as const,
        text: `✅ Memory stored!\n\n**ID:** ${result.id}\n**Content:** ${result.content}\n**Category:** ${result.category || 'general'}\n**Created:** ${result.created_at}`,
      }],
    };
  }
);

// ──────────────────────────────────────────────
// Tool 3: contextos_recall
// ──────────────────────────────────────────────
server.tool(
  'contextos_recall',
  'Retrieve all stored memories for a specific user. Returns facts, preferences, and context that ContextOS has learned about the user.',
  {
    userId: z.string().describe('User identifier to retrieve memories for'),
    category: z.string().optional().describe('Optional filter by category'),
  },
  async ({ userId, category }) => {
    const params = new URLSearchParams({ userId });
    if (category) params.append('category', category);

    const result = await apiRequest<any>('GET', `/memories?${params.toString()}`);

    if (!result.memories?.length) {
      return { content: [{ type: 'text' as const, text: `No memories found for user "${userId}".` }] };
    }

    const lines = [
      `**Memories for "${userId}"** (${result.total} total):`,
      '',
      ...result.memories.map((m: any, i: number) =>
        `${i + 1}. [${m.category || 'general'}] ${m.content} (confidence: ${m.confidence || 'N/A'})`
      ),
    ];

    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  }
);

// ──────────────────────────────────────────────
// Tool 4: contextos_sessions
// ──────────────────────────────────────────────
server.tool(
  'contextos_sessions',
  'List conversation sessions tracked by ContextOS. Shows session history with turn counts and token usage.',
  {
    limit: z.number().optional().default(10).describe('Max number of sessions to return'),
  },
  async ({ limit }) => {
    const result = await apiRequest<any>('GET', `/sessions?limit=${limit}`);

    if (!result.sessions?.length) {
      return { content: [{ type: 'text' as const, text: 'No sessions found.' }] };
    }

    const lines = [
      `**Sessions** (${result.total} total):`,
      '',
      ...result.sessions.map((s: any, i: number) =>
        `${i + 1}. **${s.id}** — ${s.turn_count} turns, ${s.token_count} tokens, last active: ${s.last_active_at}`
      ),
    ];

    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  }
);

// ──────────────────────────────────────────────
// Tool 5: contextos_analytics
// ──────────────────────────────────────────────
server.tool(
  'contextos_analytics',
  'Get token usage statistics and cost breakdown from ContextOS. Shows how many tokens were used and how much they cost over a time period.',
  {
    from: z.string().optional().describe('Start date (YYYY-MM-DD). Defaults to 30 days ago'),
    to: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today'),
  },
  async ({ from, to }) => {
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];

    const [usage, costs] = await Promise.all([
      apiRequest<any>('GET', `/analytics/usage?from=${fromDate}&to=${toDate}`),
      apiRequest<any>('GET', `/analytics/costs?from=${fromDate}&to=${toDate}`),
    ]);

    const lines = [
      `**Analytics (${fromDate} → ${toDate})**`,
      '',
      '**Usage:**',
      ...(usage.usage || []).map((u: any) =>
        `- ${u.date || u.model}: ${u.total_tokens} tokens, ${u.call_count} calls`
      ),
      '',
      `**Total Cost:** $${costs.totalCost?.toFixed(4) || '0.0000'}`,
      '',
      '**Cost by Model:**',
      ...(costs.byModel || []).map((c: any) =>
        `- ${c.model}: $${parseFloat(c.total_cost || 0).toFixed(4)} (${c.call_count} calls)`
      ),
    ];

    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  }
);

// ──────────────────────────────────────────────
// Tool 6: contextos_gdpr_delete
// ──────────────────────────────────────────────
server.tool(
  'contextos_gdpr_delete',
  'Delete ALL memories for a specific user (GDPR compliance). This action is irreversible. Requires explicit confirmation.',
  {
    userId: z.string().describe('User identifier whose memories will be deleted'),
    confirmDelete: z.boolean().describe('Must be set to true to confirm deletion. Safety mechanism.'),
  },
  async ({ userId, confirmDelete }) => {
    if (!confirmDelete) {
      return {
        content: [{
          type: 'text' as const,
          text: `⚠️ Deletion NOT executed. Set confirmDelete to true to permanently delete all memories for "${userId}".`,
        }],
      };
    }

    const result = await apiRequest<any>('DELETE', `/memories?userId=${userId}`);

    return {
      content: [{
        type: 'text' as const,
        text: `🗑️ GDPR Delete Complete\n\n**User:** ${result.userId}\n**Memories deleted:** ${result.deleted}`,
      }],
    };
  }
);

// ──────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ContextOS MCP Server running on stdio');
  console.error(`API: ${API_URL}`);
}

main().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
