import type { FastifyInstance } from 'fastify';
import db from '../db.js';
import { type AuthenticatedRequest } from '../middleware/auth.js';

export default async function sessionRoutes(fastify: FastifyInstance) {
  // GET /sessions - list sessions for a user
  fastify.get('/sessions', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const query = request.query as any;

    let sessionsQuery = db('sessions')
      .where('sessions.project_id', project.id)
      .orderBy('sessions.last_active_at', 'desc')
      .limit(parseInt(query.limit || '10'));

    if (query.userId) {
      sessionsQuery = sessionsQuery
        .join('app_users', 'sessions.app_user_id', 'app_users.id')
        .where('app_users.external_id', query.userId)
        .select('sessions.*', 'app_users.external_id as user_id');
    } else {
      sessionsQuery = sessionsQuery
        .leftJoin('app_users', 'sessions.app_user_id', 'app_users.id')
        .select('sessions.*', 'app_users.external_id as user_id');
    }

    const sessions = await sessionsQuery;
    return reply.send({ sessions });
  });

  // GET /sessions/:id - session detail
  fastify.get('/sessions/:id', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const { id } = request.params as { id: string };

    const session = await db('sessions')
      .leftJoin('app_users', 'sessions.app_user_id', 'app_users.id')
      .where({ 'sessions.id': id, 'sessions.project_id': project.id })
      .select('sessions.*', 'app_users.external_id as user_id')
      .first();

    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    return reply.send(session);
  });

  // GET /sessions/:id/messages - full message history
  fastify.get('/sessions/:id/messages', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const { id } = request.params as { id: string };

    // Verify session belongs to project
    const session = await db('sessions')
      .where({ id, project_id: project.id })
      .first();

    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    const messages = await db('messages')
      .where({ session_id: id })
      .orderBy('created_at', 'asc');

    return reply.send({ messages, session });
  });

  // DELETE /sessions/:id - delete session + messages
  fastify.delete('/sessions/:id', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const { id } = request.params as { id: string };

    const session = await db('sessions')
      .where({ id, project_id: project.id })
      .first();

    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    // Messages cascade delete via FK
    await db('sessions').where({ id }).del();

    return reply.send({ success: true });
  });
}
