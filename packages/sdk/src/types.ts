// === Request/Response Types ===

export interface ContextOSConfig {
  apiKey: string;
  baseUrl?: string;
  defaultOptions?: ChatOptions;
}

export interface ChatOptions {
  enableMemory?: boolean;
  enableCompression?: boolean;
  promptTemplateId?: string;
  stream?: boolean;
}

export interface ChatRequest {
  userId: string;
  message: string;
  sessionId?: string;
  model?: string;
  options?: ChatOptions;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  usage: UsageInfo;
  debug: DebugInfo;
}

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  costUsd: number;
}

export interface DebugInfo {
  memoriesInjected: number;
  wasCompressed: boolean;
  promptVersion: string | null;
}

// === Memory Types ===

export interface Memory {
  id: string;
  project_id: string;
  app_user_id: string;
  content: string;
  category: string | null;
  confidence: number;
  embedding_id: string | null;
  source_session_id: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface MemoryListResponse {
  memories: Memory[];
  total: number;
}

export interface MemoryListOptions {
  category?: string;
  limit?: number;
  offset?: number;
}

export interface CreateMemoryInput {
  content: string;
  category?: string;
}

export interface UpdateMemoryInput {
  content?: string;
  category?: string;
  expires_at?: string;
}

// === Session Types ===

export interface Session {
  id: string;
  project_id: string;
  app_user_id: string;
  user_id?: string;
  compressed_summary: string | null;
  turn_count: number;
  token_count: number;
  last_active_at: string;
  created_at: string;
}

export interface SessionListResponse {
  sessions: Session[];
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  token_count: number | null;
  created_at: string;
}

export interface SessionMessagesResponse {
  messages: Message[];
  session: Session;
}

// === Prompt Types ===

export interface PromptTemplate {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface PromptVersion {
  id: string;
  template_id: string;
  version: string;
  content: string;
  variables: string[];
  deployment: 'draft' | 'staging' | 'production' | 'canary';
  canary_pct: number;
  created_at: string;
}

export interface PromptTemplateListResponse {
  templates: PromptTemplate[];
}

export interface PromptVersionListResponse {
  template: PromptTemplate;
  versions: PromptVersion[];
}

// === Analytics Types ===

export interface UsageData {
  date?: string;
  model?: string;
  total_tokens: number;
  total_calls: number;
  total_cost_usd: number;
}

export interface UsageResponse {
  usage: UsageData[];
  from: string;
  to: string;
  groupBy: string;
}

export interface CostResponse {
  total: number;
  byModel: Array<{
    model: string;
    cost: number;
    tokens: number;
    calls: number;
  }>;
  from: string;
  to: string;
}

export interface CallLog {
  id: string;
  project_id: string;
  session_id: string | null;
  app_user_id: string | null;
  prompt_version_id: string | null;
  model: string;
  messages_payload: any;
  response_payload: any;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  cost_usd: number;
  created_at: string;
}

export interface CallLogsResponse {
  logs: CallLog[];
  total: number;
}

// === Error Types ===

export class ContextOSError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public body?: any
  ) {
    super(message);
    this.name = 'ContextOSError';
  }
}
