import db from '../db.js';
import { embed } from './llm.service.js';
import { upsertVector, searchVectors, deleteVector, deleteVectorsByFilter } from '../qdrant.js';
import { v4 as uuidv4 } from 'uuid';
import { chat as llmChat, type ChatMessage } from './llm.service.js';

export interface Memory {
  id: string;
  project_id: string;
  app_user_id: string;
  content: string;
  category: string | null;
  confidence: number;
  embedding_id: string | null;
  source_session_id: string | null;
  expires_at: string | null;
  created_at: string;
}

/**
 * Extract memories from a conversation turn using LLM
 */
export async function extractMemories(
  projectId: string,
  appUserId: string,
  sessionId: string,
  userMessage: string,
  assistantResponse: string
): Promise<Memory[]> {
  const extractionPrompt: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a memory extraction agent. Extract key facts from the conversation that should be remembered about the user.

Return a JSON array of objects with:
- "content": the fact to remember (string)
- "category": one of "personal", "preference", "goal", "context"
- "confidence": how confident you are this is a lasting fact (0.0 to 1.0)

Only extract meaningful, lasting facts. Skip greetings and transient information.
If no facts worth remembering, return an empty array [].
Return ONLY valid JSON, no markdown.`,
    },
    {
      role: 'user',
      content: `User said: "${userMessage}"
Assistant replied: "${assistantResponse}"

Extract memorable facts:`,
    },
  ];

  try {
    const result = await llmChat(extractionPrompt, 'gpt-4o-mini');
    const facts = JSON.parse(result.response.replace(/```json?\n?/g, '').replace(/```/g, '').trim());

    if (!Array.isArray(facts)) return [];

    const memories: Memory[] = [];
    for (const fact of facts) {
      if (!fact.content || typeof fact.content !== 'string') continue;

      const embeddingId = uuidv4();
      const vector = await embed(fact.content);

      // Store in Qdrant
      await upsertVector(embeddingId, vector, {
        project_id: projectId,
        app_user_id: appUserId,
        content: fact.content,
        category: fact.category || 'context',
      });

      // Store in PostgreSQL
      const [memory] = await db('memories').insert({
        project_id: projectId,
        app_user_id: appUserId,
        content: fact.content,
        category: fact.category || 'context',
        confidence: fact.confidence || 0.8,
        embedding_id: embeddingId,
        source_session_id: sessionId,
      }).returning('*');

      memories.push(memory);
    }

    return memories;
  } catch (err: any) {
    console.error('Memory extraction failed:', err.message);
    return [];
  }
}

/**
 * Retrieve relevant memories via semantic search
 */
export async function retrieveRelevant(
  projectId: string,
  appUserId: string,
  query: string,
  topK: number = 5
): Promise<Memory[]> {
  try {
    const queryVector = await embed(query);
    const results = await searchVectors(queryVector, {
      project_id: projectId,
      app_user_id: appUserId,
    }, topK);

    if (results.length === 0) return [];

    // Fetch full memory objects from DB
    const embeddingIds = results.map(r => r.payload?.embedding_id || r.id);
    const memories = await db('memories')
      .where('project_id', projectId)
      .where('app_user_id', appUserId)
      .whereIn('embedding_id', embeddingIds)
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date().toISOString());
      })
      .orderBy('created_at', 'desc');

    return memories;
  } catch (err: any) {
    console.error('Memory retrieval failed:', err.message);
    // Fallback: return recent memories from DB
    return db('memories')
      .where('project_id', projectId)
      .where('app_user_id', appUserId)
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', new Date().toISOString());
      })
      .orderBy('created_at', 'desc')
      .limit(topK);
  }
}

/**
 * List memories for a user
 */
export async function listMemories(
  projectId: string,
  userId?: string,
  category?: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ memories: Memory[]; total: number }> {
  let query = db('memories')
    .where('memories.project_id', projectId);

  if (userId) {
    query = query
      .join('app_users', 'memories.app_user_id', 'app_users.id')
      .where('app_users.external_id', userId);
  }

  if (category) {
    query = query.where('memories.category', category);
  }

  const countQuery = query.clone().count('memories.id as count').first();
  const dataQuery = query.clone()
    .select('memories.*')
    .orderBy('memories.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  const [countResult, memories] = await Promise.all([countQuery, dataQuery]);
  return {
    memories,
    total: Number((countResult as any)?.count || 0),
  };
}

/**
 * Create a manual memory
 */
export async function createMemory(
  projectId: string,
  appUserId: string,
  content: string,
  category?: string
): Promise<Memory> {
  const embeddingId = uuidv4();
  const vector = await embed(content);

  await upsertVector(embeddingId, vector, {
    project_id: projectId,
    app_user_id: appUserId,
    content,
    category: category || 'context',
  });

  const [memory] = await db('memories').insert({
    project_id: projectId,
    app_user_id: appUserId,
    content,
    category: category || 'context',
    confidence: 1.0,
    embedding_id: embeddingId,
  }).returning('*');

  return memory;
}

/**
 * Update a memory
 */
export async function updateMemory(
  memoryId: string,
  projectId: string,
  updates: { content?: string; category?: string; expires_at?: string }
): Promise<Memory | null> {
  const existing = await db('memories').where({ id: memoryId, project_id: projectId }).first();
  if (!existing) return null;

  // Re-embed if content changed
  if (updates.content && updates.content !== existing.content && existing.embedding_id) {
    const vector = await embed(updates.content);
    await upsertVector(existing.embedding_id, vector, {
      project_id: projectId,
      app_user_id: existing.app_user_id,
      content: updates.content,
      category: updates.category || existing.category,
    });
  }

  const [updated] = await db('memories')
    .where({ id: memoryId, project_id: projectId })
    .update(updates)
    .returning('*');

  return updated;
}

/**
 * Delete a single memory
 */
export async function deleteMemory(memoryId: string, projectId: string): Promise<boolean> {
  const memory = await db('memories').where({ id: memoryId, project_id: projectId }).first();
  if (!memory) return false;

  if (memory.embedding_id) {
    try { await deleteVector(memory.embedding_id); } catch {}
  }

  await db('memories').where({ id: memoryId }).del();
  return true;
}

/**
 * Delete all memories for a user (GDPR)
 */
export async function deleteAllMemories(projectId: string, externalUserId: string): Promise<number> {
  const appUser = await db('app_users')
    .where({ project_id: projectId, external_id: externalUserId })
    .first();

  if (!appUser) return 0;

  // Delete from Qdrant
  try {
    await deleteVectorsByFilter({
      project_id: projectId,
      app_user_id: appUser.id,
    });
  } catch {}

  // Delete from PostgreSQL
  const deleted = await db('memories')
    .where({ project_id: projectId, app_user_id: appUser.id })
    .del();

  return deleted;
}
