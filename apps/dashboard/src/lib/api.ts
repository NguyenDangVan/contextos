const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/v1';
const API_KEY = typeof window !== 'undefined'
  ? localStorage.getItem('contextos_api_key') || 'ctx_demo_key_2026_hackathon_testsprite'
  : 'ctx_demo_key_2026_hackathon_testsprite';

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Chat
  chat: (body: any) => request('POST', '/chat', body),

  // Memories
  getMemories: (params?: string) => request<any>('GET', `/memories${params ? `?${params}` : ''}`),
  createMemory: (body: any) => request('POST', '/memories', body),
  deleteMemory: (id: string) => request('DELETE', `/memories/${id}`),
  deleteAllMemories: (userId: string) => request('DELETE', `/memories?userId=${userId}`),

  // Sessions
  getSessions: (params?: string) => request<any>('GET', `/sessions${params ? `?${params}` : ''}`),
  getSession: (id: string) => request<any>('GET', `/sessions/${id}`),
  getSessionMessages: (id: string) => request<any>('GET', `/sessions/${id}/messages`),

  // Prompts
  getPrompts: () => request<any>('GET', '/prompts'),
  createPrompt: (body: any) => request('POST', '/prompts', body),
  getPromptVersions: (id: string) => request<any>('GET', `/prompts/${id}/versions`),
  createPromptVersion: (id: string, body: any) => request('POST', `/prompts/${id}/versions`, body),
  updatePromptVersion: (id: string, vid: string, body: any) => request('PATCH', `/prompts/${id}/versions/${vid}`, body),
  rollbackPrompt: (id: string, versionId: string) => request('POST', `/prompts/${id}/rollback`, { versionId }),

  // Analytics
  getUsage: (from: string, to: string, groupBy?: string) =>
    request<any>('GET', `/analytics/usage?from=${from}&to=${to}${groupBy ? `&groupBy=${groupBy}` : ''}`),
  getCosts: (from: string, to: string) => request<any>('GET', `/analytics/costs?from=${from}&to=${to}`),
  getCalls: (params?: string) => request<any>('GET', `/analytics/calls${params ? `?${params}` : ''}`),
  getCall: (id: string) => request<any>('GET', `/analytics/calls/${id}`),
};
