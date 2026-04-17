import db from '../db.js';
import { chat as llmChat, type ChatMessage } from './llm.service.js';

/**
 * Check if conversation history needs compression
 */
export function shouldCompress(
  messages: { content: string }[],
  thresholdRatio: number = 0.8,
  maxTokens: number = 128000 // gpt-4o context window
): boolean {
  const estimatedTokens = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  return estimatedTokens > maxTokens * thresholdRatio;
}

/**
 * Compress conversation history by summarizing older turns
 */
export async function compress(
  messages: Array<{ role: string; content: string }>,
  recentTurnsToKeep: number = 10
): Promise<{
  compressedMessages: Array<{ role: string; content: string }>;
  summary: string;
  wasCompressed: boolean;
}> {
  if (messages.length <= recentTurnsToKeep) {
    return {
      compressedMessages: messages,
      summary: '',
      wasCompressed: false,
    };
  }

  // Split into older (to compress) and recent (to keep)
  const olderMessages = messages.slice(0, messages.length - recentTurnsToKeep);
  const recentMessages = messages.slice(messages.length - recentTurnsToKeep);

  // Summarize older messages
  const summaryPrompt: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a conversation summarizer. Summarize the following conversation turns into a concise summary that preserves all important context, facts, and decisions. The summary should help an AI assistant maintain continuity in the conversation.

Keep the summary under 500 words. Focus on:
- Key facts about the user
- Decisions made
- Questions asked and answered
- Any commitments or follow-ups mentioned`,
    },
    {
      role: 'user',
      content: olderMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n'),
    },
  ];

  const result = await llmChat(summaryPrompt, 'gpt-4o-mini');
  const summary = result.response;

  // Build compressed message list
  const compressedMessages = [
    {
      role: 'system' as const,
      content: `[Previous conversation summary]\n${summary}`,
    },
    ...recentMessages,
  ];

  return {
    compressedMessages,
    summary,
    wasCompressed: true,
  };
}

/**
 * Update session with compression summary
 */
export async function saveCompressionSummary(
  sessionId: string,
  summary: string
): Promise<void> {
  await db('sessions')
    .where({ id: sessionId })
    .update({ compressed_summary: summary });
}

/**
 * Estimate token count for text (rough approximation: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate token count for a messages array
 */
export function estimateMessagesTokens(messages: Array<{ content: string }>): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0); // +4 per message overhead
}
