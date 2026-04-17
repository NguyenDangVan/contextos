import type { FastifyRequest, FastifyReply } from 'fastify';
import CryptoJS from 'crypto-js';
import db from '../db.js';

export interface AuthenticatedRequest extends FastifyRequest {
  project?: {
    id: string;
    owner_id: string;
    name: string;
    llm_provider: string;
    settings: any;
  };
}

/**
 * API key authentication middleware
 * Extracts Bearer token, hashes it, and looks up the project
 */
export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected: Bearer <api_key>',
    });
    return;
  }

  const apiKey = authHeader.slice(7); // Remove 'Bearer '

  if (!apiKey || apiKey.length < 10) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key format',
    });
    return;
  }

  // Hash the API key for secure lookup
  const apiKeyHash = CryptoJS.SHA256(apiKey).toString();

  const project = await db('projects')
    .where('api_key_hash', apiKeyHash)
    .first();

  if (!project) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
    return;
  }

  // Parse settings if string
  if (typeof project.settings === 'string') {
    project.settings = JSON.parse(project.settings);
  }

  // Attach project to request
  request.project = project;
}
