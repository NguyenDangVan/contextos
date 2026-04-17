import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import db from '../db.js';
import { type AuthenticatedRequest } from '../middleware/auth.js';
import * as memoryService from '../services/memory.service.js';

export default async function memoryRoutes(fastify: FastifyInstance) {
  // GET /memories - list memories
  fastify.get('/memories', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const query = request.query as any;

    const { memories, total } = await memoryService.listMemories(
      project.id,
      query.userId,
      query.category,
      parseInt(query.limit || '20'),
      parseInt(query.offset || '0')
    );

    return reply.send({ memories, total });
  });

  // POST /memories - create memory
  fastify.post('/memories', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const body = z.object({
      userId: z.string().min(1),
      content: z.string().min(1),
      category: z.string().optional(),
    }).parse(request.body);

    // Find or create app user
    let appUser = await db('app_users')
      .where({ project_id: project.id, external_id: body.userId })
      .first();

    if (!appUser) {
      [appUser] = await db('app_users')
        .insert({ project_id: project.id, external_id: body.userId })
        .returning('*');
    }

    const memory = await memoryService.createMemory(
      project.id,
      appUser.id,
      body.content,
      body.category
    );

    return reply.code(201).send(memory);
  });

  // PATCH /memories/:id - update memory
  fastify.patch('/memories/:id', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const { id } = request.params as { id: string };
    const body = z.object({
      content: z.string().optional(),
      category: z.string().optional(),
      expires_at: z.string().optional(),
    }).parse(request.body);

    const updated = await memoryService.updateMemory(id, project.id, body);

    if (!updated) {
      return reply.code(404).send({ error: 'Memory not found' });
    }

    return reply.send(updated);
  });

  // DELETE /memories/:id - delete single memory
  fastify.delete('/memories/:id', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const { id } = request.params as { id: string };

    const deleted = await memoryService.deleteMemory(id, project.id);

    if (!deleted) {
      return reply.code(404).send({ error: 'Memory not found' });
    }

    return reply.send({ success: true });
  });

  // DELETE /memories?userId=xxx - GDPR bulk delete
  fastify.delete('/memories', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const query = request.query as any;

    if (!query.userId) {
      return reply.code(400).send({ error: 'userId query parameter required for bulk delete' });
    }

    const count = await memoryService.deleteAllMemories(project.id, query.userId);

    return reply.send({ deleted: count, userId: query.userId });
  });
}
