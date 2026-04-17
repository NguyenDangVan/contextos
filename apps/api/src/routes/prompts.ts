import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import db from '../db.js';
import { type AuthenticatedRequest } from '../middleware/auth.js';
import * as promptService from '../services/prompt.service.js';

export default async function promptRoutes(fastify: FastifyInstance) {
  // GET /prompts - list templates
  fastify.get('/prompts', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const templates = await promptService.listTemplates(project.id);
    return reply.send({ templates });
  });

  // POST /prompts - create template
  fastify.post('/prompts', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }).parse(request.body);

    const [template] = await db('prompt_templates').insert({
      project_id: project.id,
      name: body.name,
      description: body.description || null,
    }).returning('*');

    return reply.code(201).send(template);
  });

  // GET /prompts/:id/versions - list versions
  fastify.get('/prompts/:id/versions', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const { id } = request.params as { id: string };

    // Verify template belongs to project
    const template = await db('prompt_templates')
      .where({ id, project_id: project.id })
      .first();

    if (!template) {
      return reply.code(404).send({ error: 'Template not found' });
    }

    const versions = await promptService.listVersions(id);
    return reply.send({ template, versions });
  });

  // POST /prompts/:id/versions - create new version
  fastify.post('/prompts/:id/versions', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const { id } = request.params as { id: string };
    const body = z.object({
      content: z.string().min(1),
      variables: z.array(z.string()).optional(),
    }).parse(request.body);

    // Verify template belongs to project
    const template = await db('prompt_templates')
      .where({ id, project_id: project.id })
      .first();

    if (!template) {
      return reply.code(404).send({ error: 'Template not found' });
    }

    const version = await promptService.incrementVersion(id);

    const [created] = await db('prompt_versions').insert({
      template_id: id,
      version,
      content: body.content,
      variables: JSON.stringify(body.variables || []),
      deployment: 'draft',
    }).returning('*');

    return reply.code(201).send(created);
  });

  // PATCH /prompts/:id/versions/:versionId - update deployment
  fastify.patch('/prompts/:id/versions/:versionId', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const { id, versionId } = request.params as { id: string; versionId: string };
    const body = z.object({
      deployment: z.enum(['draft', 'staging', 'production', 'canary']).optional(),
      canary_pct: z.number().min(0).max(100).optional(),
    }).parse(request.body);

    // Verify ownership
    const template = await db('prompt_templates')
      .where({ id, project_id: project.id })
      .first();

    if (!template) {
      return reply.code(404).send({ error: 'Template not found' });
    }

    const updates: any = {};
    if (body.deployment) updates.deployment = body.deployment;
    if (body.canary_pct !== undefined) updates.canary_pct = body.canary_pct;

    const [updated] = await db('prompt_versions')
      .where({ id: versionId, template_id: id })
      .update(updates)
      .returning('*');

    if (!updated) {
      return reply.code(404).send({ error: 'Version not found' });
    }

    return reply.send(updated);
  });

  // POST /prompts/:id/rollback - rollback to specific version
  fastify.post('/prompts/:id/rollback', async (request: AuthenticatedRequest, reply) => {
    const project = request.project!;
    const { id } = request.params as { id: string };
    const body = z.object({
      versionId: z.string().uuid(),
    }).parse(request.body);

    // Verify ownership
    const template = await db('prompt_templates')
      .where({ id, project_id: project.id })
      .first();

    if (!template) {
      return reply.code(404).send({ error: 'Template not found' });
    }

    // Demote current production version
    await db('prompt_versions')
      .where({ template_id: id, deployment: 'production' })
      .update({ deployment: 'draft' });

    // Promote target version
    const [promoted] = await db('prompt_versions')
      .where({ id: body.versionId, template_id: id })
      .update({ deployment: 'production' })
      .returning('*');

    if (!promoted) {
      return reply.code(404).send({ error: 'Version not found' });
    }

    return reply.send({ success: true, promoted });
  });
}
