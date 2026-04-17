import db from '../db.js';

/**
 * Resolve a prompt template with variables
 */
export async function resolvePrompt(
  projectId: string,
  templateId: string,
  variables: Record<string, string> = {},
  deployment: string = 'production'
): Promise<{ content: string; version: string; versionId: string } | null> {
  // Get the active version for the deployment
  const version = await db('prompt_versions')
    .join('prompt_templates', 'prompt_versions.template_id', 'prompt_templates.id')
    .where('prompt_templates.project_id', projectId)
    .where('prompt_versions.template_id', templateId)
    .where('prompt_versions.deployment', deployment)
    .orderBy('prompt_versions.created_at', 'desc')
    .select('prompt_versions.*')
    .first();

  if (!version) return null;

  // Resolve variables in content
  let content = version.content;
  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return {
    content,
    version: version.version,
    versionId: version.id,
  };
}

/**
 * Resolve with canary logic
 */
export async function resolveWithCanary(
  projectId: string,
  templateId: string,
  variables: Record<string, string> = {}
): Promise<{ content: string; version: string; versionId: string } | null> {
  // Check if there's a canary version
  const canaryVersion = await db('prompt_versions')
    .join('prompt_templates', 'prompt_versions.template_id', 'prompt_templates.id')
    .where('prompt_templates.project_id', projectId)
    .where('prompt_versions.template_id', templateId)
    .where('prompt_versions.deployment', 'canary')
    .where('prompt_versions.canary_pct', '>', 0)
    .orderBy('prompt_versions.created_at', 'desc')
    .select('prompt_versions.*')
    .first();

  if (canaryVersion) {
    // Roll the dice for canary
    if (Math.random() * 100 < canaryVersion.canary_pct) {
      let content = canaryVersion.content;
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      return {
        content,
        version: canaryVersion.version,
        versionId: canaryVersion.id,
      };
    }
  }

  // Fall back to production version
  return resolvePrompt(projectId, templateId, variables, 'production');
}

/**
 * Auto-increment semver for a template
 */
export async function incrementVersion(templateId: string): Promise<string> {
  const latestVersion = await db('prompt_versions')
    .where('template_id', templateId)
    .orderBy('created_at', 'desc')
    .select('version')
    .first();

  if (!latestVersion) return '1.0.0';

  const parts = latestVersion.version.split('.').map(Number);
  parts[2] += 1; // Increment patch

  // Roll over
  if (parts[2] >= 100) {
    parts[2] = 0;
    parts[1] += 1;
  }
  if (parts[1] >= 100) {
    parts[1] = 0;
    parts[0] += 1;
  }

  return parts.join('.');
}

/**
 * List templates for a project
 */
export async function listTemplates(projectId: string) {
  return db('prompt_templates')
    .where('project_id', projectId)
    .orderBy('created_at', 'desc');
}

/**
 * List versions for a template
 */
export async function listVersions(templateId: string) {
  return db('prompt_versions')
    .where('template_id', templateId)
    .orderBy('created_at', 'desc');
}
