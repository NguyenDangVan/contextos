import db from '../db.js';

/**
 * Evaluate routing rules and select the target model
 */
export async function evaluateRules(
  projectId: string,
  message: string,
  defaultModel: string
): Promise<string> {
  const rules = await db('routing_rules')
    .where({ project_id: projectId, is_active: true })
    .orderBy('priority', 'asc');

  for (const rule of rules) {
    const condition = typeof rule.condition === 'string'
      ? JSON.parse(rule.condition)
      : rule.condition;

    if (matchesCondition(condition, message)) {
      return rule.target_model;
    }
  }

  return defaultModel;
}

/**
 * Check if a user has exceeded their token budget
 */
export async function checkBudget(
  projectId: string,
  appUserId: string,
  monthlyBudgetTokens?: number
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  if (!monthlyBudgetTokens) {
    return { allowed: true, used: 0, limit: null };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await db('call_logs')
    .where('project_id', projectId)
    .where('app_user_id', appUserId)
    .where('created_at', '>=', startOfMonth.toISOString())
    .sum('total_tokens as total')
    .first();

  const used = Number(result?.total || 0);

  return {
    allowed: used < monthlyBudgetTokens,
    used,
    limit: monthlyBudgetTokens,
  };
}

// --- Condition matching engine ---

function matchesCondition(condition: Record<string, any>, message: string): boolean {
  for (const [key, rule] of Object.entries(condition)) {
    switch (key) {
      case 'messageLength':
        if (!matchNumericRule(rule, message.length)) return false;
        break;
      case 'contains':
        if (typeof rule === 'string' && !message.toLowerCase().includes(rule.toLowerCase())) return false;
        break;
      case 'startsWith':
        if (typeof rule === 'string' && !message.toLowerCase().startsWith(rule.toLowerCase())) return false;
        break;
      case 'regex':
        try {
          if (typeof rule === 'string' && !new RegExp(rule, 'i').test(message)) return false;
        } catch {
          return false;
        }
        break;
      default:
        // Unknown condition key, skip
        break;
    }
  }
  return true;
}

function matchNumericRule(rule: Record<string, number>, value: number): boolean {
  if (rule.lt !== undefined && !(value < rule.lt)) return false;
  if (rule.lte !== undefined && !(value <= rule.lte)) return false;
  if (rule.gt !== undefined && !(value > rule.gt)) return false;
  if (rule.gte !== undefined && !(value >= rule.gte)) return false;
  if (rule.eq !== undefined && value !== rule.eq) return false;
  return true;
}
