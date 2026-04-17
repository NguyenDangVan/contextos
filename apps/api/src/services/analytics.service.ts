import db from '../db.js';

export interface UsageData {
  date: string;
  model: string;
  total_tokens: number;
  total_calls: number;
  total_cost_usd: number;
}

/**
 * Get usage statistics with date range and grouping
 */
export async function getUsage(
  projectId: string,
  from: string,
  to: string,
  groupBy: 'model' | 'date' = 'date'
): Promise<UsageData[]> {
  const query = db('usage_daily')
    .where('project_id', projectId)
    .whereBetween('date', [from, to])
    .orderBy('date', 'asc');

  if (groupBy === 'model') {
    return query
      .select('model')
      .sum('total_tokens as total_tokens')
      .sum('total_calls as total_calls')
      .sum('total_cost_usd as total_cost_usd')
      .groupBy('model');
  }

  return query
    .select('date')
    .sum('total_tokens as total_tokens')
    .sum('total_calls as total_calls')
    .sum('total_cost_usd as total_cost_usd')
    .groupBy('date')
    .orderBy('date', 'asc');
}

/**
 * Get cost breakdown by model
 */
export async function getCosts(
  projectId: string,
  from: string,
  to: string
): Promise<{
  total: number;
  byModel: Array<{ model: string; cost: number; tokens: number; calls: number }>;
}> {
  const data = await db('usage_daily')
    .where('project_id', projectId)
    .whereBetween('date', [from, to])
    .select('model')
    .sum('total_tokens as tokens')
    .sum('total_calls as calls')
    .sum('total_cost_usd as cost')
    .groupBy('model');

  const total = data.reduce((sum: number, d: any) => sum + Number(d.cost), 0);
  const byModel = data.map((d: any) => ({
    model: d.model,
    cost: Number(d.cost),
    tokens: Number(d.tokens),
    calls: Number(d.calls),
  }));

  return { total, byModel };
}

/**
 * Get call logs with filters
 */
export async function getCallLogs(
  projectId: string,
  options: {
    sessionId?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  let query = db('call_logs')
    .where('project_id', projectId)
    .orderBy('created_at', 'desc');

  if (options.sessionId) {
    query = query.where('session_id', options.sessionId);
  }

  const total = await query.clone().count('id as count').first();
  const logs = await query
    .limit(options.limit || 50)
    .offset(options.offset || 0);

  return {
    logs,
    total: Number((total as any)?.count || 0),
  };
}

/**
 * Get a single call log for context debugger
 */
export async function getCallLog(callId: string, projectId: string) {
  return db('call_logs')
    .where({ id: callId, project_id: projectId })
    .first();
}

/**
 * Upsert daily usage aggregate
 */
export async function upsertDailyUsage(
  projectId: string,
  model: string,
  tokens: number,
  costUsd: number,
  date: string
): Promise<void> {
  const existing = await db('usage_daily')
    .where({ project_id: projectId, date, model })
    .first();

  if (existing) {
    await db('usage_daily')
      .where({ id: existing.id })
      .update({
        total_tokens: db.raw('total_tokens + ?', [tokens]),
        total_calls: db.raw('total_calls + 1'),
        total_cost_usd: db.raw('total_cost_usd + ?', [costUsd]),
      });
  } else {
    await db('usage_daily').insert({
      project_id: projectId,
      date,
      model,
      total_tokens: tokens,
      total_calls: 1,
      total_cost_usd: costUsd,
    });
  }
}
