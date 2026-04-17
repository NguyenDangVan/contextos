import { HttpClient } from './client.js';
import type {
  ContextOSConfig,
  ChatRequest,
  ChatResponse,
  Memory,
  MemoryListResponse,
  MemoryListOptions,
  CreateMemoryInput,
  UpdateMemoryInput,
  Session,
  SessionListResponse,
  SessionMessagesResponse,
  PromptTemplate,
  PromptTemplateListResponse,
  PromptVersionListResponse,
  PromptVersion,
  UsageResponse,
  CostResponse,
  CallLogsResponse,
  CallLog,
} from './types.js';

export class ContextOS {
  private client: HttpClient;
  private defaultOptions: ChatRequest['options'];

  public memory: MemoryModule;
  public sessions: SessionsModule;
  public prompts: PromptsModule;
  public analytics: AnalyticsModule;

  constructor(config: ContextOSConfig) {
    const baseUrl = config.baseUrl || 'https://api.contextos.dev/v1';
    this.client = new HttpClient(baseUrl, config.apiKey);
    this.defaultOptions = config.defaultOptions;

    // Initialize modules
    this.memory = new MemoryModule(this.client);
    this.sessions = new SessionsModule(this.client);
    this.prompts = new PromptsModule(this.client);
    this.analytics = new AnalyticsModule(this.client);
  }

  /**
   * Send a chat message with automatic memory, compression, and context management
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body = {
      ...request,
      options: { ...this.defaultOptions, ...request.options },
    };
    return this.client.post<ChatResponse>('/chat', body);
  }
}

// === Memory Module ===
class MemoryModule {
  constructor(private client: HttpClient) {}

  async list(userId: string, options: MemoryListOptions = {}): Promise<MemoryListResponse> {
    return this.client.get<MemoryListResponse>('/memories', {
      userId,
      category: options.category,
      limit: options.limit,
      offset: options.offset,
    });
  }

  async create(userId: string, input: CreateMemoryInput): Promise<Memory> {
    return this.client.post<Memory>('/memories', {
      userId,
      content: input.content,
      category: input.category,
    });
  }

  async update(id: string, input: UpdateMemoryInput): Promise<Memory> {
    return this.client.patch<Memory>(`/memories/${id}`, input);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/memories/${id}`);
  }

  async deleteAll(userId: string): Promise<{ deleted: number; userId: string }> {
    return this.client.delete<{ deleted: number; userId: string }>('/memories', { userId });
  }
}

// === Sessions Module ===
class SessionsModule {
  constructor(private client: HttpClient) {}

  async list(userId?: string, limit: number = 10): Promise<SessionListResponse> {
    return this.client.get<SessionListResponse>('/sessions', { userId, limit });
  }

  async get(id: string): Promise<Session> {
    return this.client.get<Session>(`/sessions/${id}`);
  }

  async getMessages(id: string): Promise<SessionMessagesResponse> {
    return this.client.get<SessionMessagesResponse>(`/sessions/${id}/messages`);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/sessions/${id}`);
  }
}

// === Prompts Module ===
class PromptsModule {
  constructor(private client: HttpClient) {}

  async list(): Promise<PromptTemplateListResponse> {
    return this.client.get<PromptTemplateListResponse>('/prompts');
  }

  async create(name: string, description?: string): Promise<PromptTemplate> {
    return this.client.post<PromptTemplate>('/prompts', { name, description });
  }

  async listVersions(templateId: string): Promise<PromptVersionListResponse> {
    return this.client.get<PromptVersionListResponse>(`/prompts/${templateId}/versions`);
  }

  async createVersion(templateId: string, content: string, variables?: string[]): Promise<PromptVersion> {
    return this.client.post<PromptVersion>(`/prompts/${templateId}/versions`, { content, variables });
  }

  async deploy(templateId: string, versionId: string, deployment: string, canaryPct?: number): Promise<PromptVersion> {
    return this.client.patch<PromptVersion>(`/prompts/${templateId}/versions/${versionId}`, {
      deployment,
      canary_pct: canaryPct,
    });
  }

  async rollback(templateId: string, versionId: string): Promise<{ success: boolean; promoted: PromptVersion }> {
    return this.client.post<{ success: boolean; promoted: PromptVersion }>(`/prompts/${templateId}/rollback`, { versionId });
  }
}

// === Analytics Module ===
class AnalyticsModule {
  constructor(private client: HttpClient) {}

  async usage(from: string, to: string, groupBy?: 'date' | 'model'): Promise<UsageResponse> {
    return this.client.get<UsageResponse>('/analytics/usage', { from, to, groupBy });
  }

  async costs(from: string, to: string): Promise<CostResponse> {
    return this.client.get<CostResponse>('/analytics/costs', { from, to });
  }

  async calls(options: { sessionId?: string; limit?: number; offset?: number } = {}): Promise<CallLogsResponse> {
    return this.client.get<CallLogsResponse>('/analytics/calls', options as any);
  }

  async getCall(callId: string): Promise<CallLog> {
    return this.client.get<CallLog>(`/analytics/calls/${callId}`);
  }
}

// Re-export types
export * from './types.js';
