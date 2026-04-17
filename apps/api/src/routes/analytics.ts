import type { FastifyInstance } from 'fastify';
import { type AuthenticatedRequest } from '../middleware/auth.js';
import * as analyticsService from '../services/analytics.service.js';

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // GET /analytics/usage - token usage stats
  fastify.get('/analytics/usage', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const query = request.query as any;

    const from = query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = query.to || new Date().toISOString().split('T')[0];
    const groupBy = query.groupBy || 'date';

    const usage = await analyticsService.getUsage(project.id, from, to, groupBy);
    return reply.send({ usage, from, to, groupBy });
  });

  // GET /analytics/costs - cost breakdown
  fastify.get('/analytics/costs', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const query = request.query as any;

    const from = query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = query.to || new Date().toISOString().split('T')[0];

    const costs = await analyticsService.getCosts(project.id, from, to);
    return reply.send({ ...costs, from, to });
  });

  // GET /analytics/calls - call log timeline
  fastify.get('/analytics/calls', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const query = request.query as any;

    const result = await analyticsService.getCallLogs(project.id, {
      sessionId: query.sessionId,
      limit: parseInt(query.limit || '50'),
      offset: parseInt(query.offset || '0'),
    });

    return reply.send(result);
  });

  // GET /analytics/calls/:callId - single call detail (context debugger)
  fastify.get('/analytics/calls/:callId', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const { callId } = request.params as { callId: string };

    const callLog = await analyticsService.getCallLog(callId, project.id);

    if (!callLog) {
      return reply.code(404).send({ error: 'Call log not found' });
    }

    // Parse JSON payloads for debugger
    if (typeof callLog.messages_payload === 'string') {
      callLog.messages_payload = JSON.parse(callLog.messages_payload);
    }
    if (typeof callLog.response_payload === 'string') {
      callLog.response_payload = JSON.parse(callLog.response_payload);
    }

    return reply.send(callLog);
  });
}
