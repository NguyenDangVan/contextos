# ContextOS — PRD + System Design
**Version:** 1.0  
**Status:** Ready to Build  
**Target:** AI Agents / Engineering Teams

---

## TABLE OF CONTENTS

1. [Product Overview](#1-product-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Stories](#3-user-stories)
4. [Feature Specifications](#4-feature-specifications)
5. [System Architecture](#5-system-architecture)
6. [Database Schema](#6-database-schema)
7. [API Specification](#7-api-specification)
8. [SDK Specification](#8-sdk-specification)
9. [Infrastructure & DevOps](#9-infrastructure--devops)
10. [Security & Compliance](#10-security--compliance)
11. [Build Roadmap](#11-build-roadmap)
12. [Open Questions](#12-open-questions)

---

## 1. PRODUCT OVERVIEW

### 1.1 Problem Statement
Developers building LLM-powered applications must solve the same infrastructure problems repeatedly:
- Managing conversation memory across sessions
- Controlling context window costs
- Debugging what context was sent to the model
- Versioning and A/B testing prompts

### 1.2 Solution
**ContextOS** is a drop-in SDK + dashboard that gives every LLM app persistent memory, cost optimization, and observability — without the developer writing any infrastructure code.

### 1.3 Positioning
> "The memory layer for LLM apps. Integrate in 10 minutes. Never lose user context again."

### 1.4 Target Users
- **Primary:** Solo devs and small teams (1–5 engineers) building LLM apps on top of OpenAI, Anthropic, or Gemini APIs
- **Secondary:** Mid-size product teams needing observability and cost control across multiple AI features
- **Anti-target:** Teams with dedicated ML infra already (they'll build in-house)

---

## 2. GOALS & SUCCESS METRICS

### 2.1 Business Goals
| Goal | Metric | Target (6 months) |
|------|--------|-------------------|
| Adoption | Registered developers | 1,000 |
| Activation | SDK installed + first API call | 60% of signups |
| Retention | MAU / registered | 40% |
| Revenue | MRR | $10,000 |
| NPS | Score | > 40 |

### 2.2 Technical Goals
- SDK integration time < 15 minutes
- Memory retrieval latency < 100ms (p95)
- API uptime 99.9%
- Zero data loss on memory writes

---

## 3. USER STORIES

### 3.1 Developer (Primary Actor)

```
US-001: As a developer, I want to install the SDK with npm and make my first 
        memory-enabled API call in under 15 minutes.

US-002: As a developer, I want user memory to automatically persist across sessions
        without writing any database code.

US-003: As a developer, I want to see what context was injected in every LLM call
        so I can debug unexpected outputs.

US-004: As a developer, I want to be alerted when my token usage spikes
        so I can prevent unexpected cost increases.

US-005: As a developer, I want to A/B test two system prompt versions
        and see which one produces better user engagement.

US-006: As a developer, I want to version my prompts like code
        so I can roll back when a change causes regressions.

US-007: As a developer, I want to set a monthly token budget per user
        so I can control costs at scale.
```

### 3.2 End User of Developer's App (Indirect Actor)

```
US-008: As an end user, I want the AI assistant to remember my preferences
        from previous conversations.

US-009: As an end user, I want my memory data to be deletable
        (GDPR / right to be forgotten).
```

---

## 4. FEATURE SPECIFICATIONS

### 4.1 Feature: Smart Memory

**Description:** Automatically extracts, stores, and retrieves relevant memories from conversations.

**Behavior:**
- After each LLM response, a background job extracts key facts (name, preferences, goals, context) using a small extraction model
- Facts are stored as structured `Memory` objects linked to a `userId`
- On each new request, relevant memories are retrieved via semantic search and injected into the context
- Memory TTL is configurable per plan (7 days free, 90 days starter, unlimited pro)

**Acceptance Criteria:**
- [ ] Memory extraction runs asynchronously (does not add latency to main call)
- [ ] Relevant memories injected in < 100ms
- [ ] Developer can view, edit, delete memories via dashboard
- [ ] Developer can disable memory for specific users via API

---

### 4.2 Feature: Context Compression

**Description:** Automatically compresses long conversation histories to fit within token limits without losing information.

**Behavior:**
- When conversation history approaches 80% of the model's context window, trigger compression
- Use a small/cheap model (e.g., claude-haiku or gpt-3.5) to summarize older turns
- Replace raw history with: compressed_summary + recent_N_turns (configurable, default: last 10)
- Log compression events in session metadata

**Acceptance Criteria:**
- [ ] Compression triggered automatically, no developer code needed
- [ ] Summary quality evaluated via automated test suite (ROUGE score > 0.7)
- [ ] Developer can configure `recentTurnsToKeep` and `compressionThreshold`

---

### 4.3 Feature: Context Debugger

**Description:** A dashboard view showing the exact payload sent to the LLM for any given request.

**Behavior:**
- Every API call logs: raw messages array, system prompt, injected memories, token count breakdown
- Dashboard provides a filterable timeline of all calls per project
- Developer can inspect any call and see a "context diff" between consecutive calls

**Acceptance Criteria:**
- [ ] Logs available within 5 seconds of the API call
- [ ] Token breakdown shows: system_prompt, memory_injection, conversation_history, user_message
- [ ] Logs retained for 30 days (free), 90 days (paid)
- [ ] Sensitive data can be masked via `maskFields: ['email', 'phone']` config

---

### 4.4 Feature: Prompt Version Control

**Description:** Git-like versioning for system prompts with deployment targeting and A/B testing.

**Behavior:**
- Developer creates named prompt templates with variables (e.g., `{userName}`, `{productName}`)
- Each save creates a new version with auto-incremented semver
- Versions can be deployed to: `production`, `staging`, or `canary` (% of traffic)
- A/B test: route X% of users to version A, Y% to version B; track token usage + custom events

**Acceptance Criteria:**
- [ ] Prompt versions stored immutably (never overwrite)
- [ ] Rollback to any previous version in < 5 seconds
- [ ] A/B test traffic split configurable between 0–100%
- [ ] A/B test results show: avg tokens/session, call volume per variant

---

### 4.5 Feature: Cost Optimizer

**Description:** Automatic token cost reduction via model routing and context trimming.

**Behavior:**
- **Model Router:** Developer defines routing rules (e.g., "if message length < 100 chars → use haiku, else use sonnet")
- **Budget Caps:** Set monthly token budget per `userId` or globally; auto-switch to cheaper model or block when exceeded
- **Cost Dashboard:** Real-time spend tracking broken down by model, project, user segment

**Acceptance Criteria:**
- [ ] Routing rules evaluated in < 5ms
- [ ] Budget cap enforced with < 1% overage tolerance
- [ ] Dashboard updates within 60 seconds of API call
- [ ] Export cost report as CSV

---

## 5. SYSTEM ARCHITECTURE

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Developer's App                               │
│                    (uses ContextOS SDK)                              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API Gateway (Kong)                              │
│              Auth (JWT) │ Rate Limiting │ Logging                   │
└───────┬───────────────┬─────────────────────────────────────────────┘
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────────────────────────────────────────┐
│  Auth        │  │             Core API (Node.js / Fastify)          │
│  Service     │  │                                                   │
│  (Supabase   │  │  ┌─────────────┐  ┌──────────────┐  ┌─────────┐ │
│  Auth)       │  │  │  Memory     │  │  Prompt      │  │  Cost   │ │
└──────────────┘  │  │  Service    │  │  Service     │  │  Service│ │
                  │  └──────┬──────┘  └──────┬───────┘  └────┬────┘ │
                  │         │                │               │       │
                  └─────────┼────────────────┼───────────────┼───────┘
                            │                │               │
        ┌───────────────────┼────────────────┼───────────────┼──────┐
        │                  ▼                ▼               ▼       │
        │  Data Layer                                               │
        │  ┌─────────────┐ ┌────────────┐ ┌────────────────────┐  │
        │  │ PostgreSQL  │ │  Redis     │ │  Qdrant            │  │
        │  │ (Supabase)  │ │  (Cache +  │ │  (Vector DB for    │  │
        │  │ Primary     │ │  Sessions) │ │  Memory Retrieval) │  │
        │  │ Data Store  │ └────────────┘ └────────────────────┘  │
        │  └─────────────┘                                         │
        └──────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────────────────────────────┐
        │  Background Workers (BullMQ + Redis)                      │
        │  ┌───────────────────┐  ┌─────────────────────────────┐  │
        │  │  Memory Extractor │  │  Log Processor              │  │
        │  │  (runs after each │  │  (aggregates token usage)   │  │
        │  │   LLM response)   │  │                             │  │
        │  └───────────────────┘  └─────────────────────────────┘  │
        └──────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────────────────────────────┐
        │  Dashboard (Next.js App)                                  │
        │  Memory Viewer │ Context Debugger │ Analytics │ Prompts   │
        └──────────────────────────────────────────────────────────┘
```

### 5.2 Request Flow — Memory-Enabled Chat

```
Developer SDK calls ctx.chat({ userId, message })
        │
        ▼
[1] Retrieve relevant memories
    → query Qdrant with message embedding
    → return top-K memories (default K=5)
        │
        ▼
[2] Compress history (if needed)
    → check token count of conversation history
    → if > threshold: summarize older turns via cheap model
        │
        ▼
[3] Build context payload
    → system_prompt + memories_block + compressed_history + user_message
        │
        ▼
[4] Route to LLM
    → apply model routing rules
    → proxy call to OpenAI / Anthropic / Gemini
        │
        ▼
[5] Return response to SDK
        │
        ├──► [6a] Log call metadata to PostgreSQL (sync, fast)
        │
        └──► [6b] Enqueue memory extraction job (async, non-blocking)
                  → extract facts from conversation turn
                  → embed + upsert into Qdrant
                  → update token usage counters
```

### 5.3 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API | Node.js + Fastify | Fast, low overhead, JS ecosystem |
| Dashboard | Next.js 14 (App Router) | SSR + React, Vercel deploy |
| Auth | Supabase Auth | Quick setup, JWT, social login |
| Primary DB | PostgreSQL (Supabase) | Relational, managed, free tier |
| Cache | Redis (Upstash) | Serverless Redis, low latency |
| Vector DB | Qdrant (self-hosted or cloud) | Best OSS option for semantic search |
| Queue | BullMQ + Redis | Background jobs for memory extraction |
| Embeddings | OpenAI text-embedding-3-small | Cheap, fast, 1536 dims |
| Hosting | Railway (API) + Vercel (Dashboard) | Fast deploy, auto-scaling |
| Observability | Axiom (logs) + Posthog (analytics) | Developer-friendly |
| SDK | TypeScript (npm package) | Type-safe, best DX |

---

## 6. DATABASE SCHEMA

```sql
-- Projects (one per developer app)
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id),
  name          VARCHAR(255) NOT NULL,
  api_key       VARCHAR(64) UNIQUE NOT NULL,
  llm_provider  VARCHAR(50) NOT NULL, -- 'openai' | 'anthropic' | 'gemini'
  settings      JSONB DEFAULT '{}',   -- { recentTurnsToKeep, compressionThreshold, etc. }
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- End users (users of the developer's app)
CREATE TABLE app_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  external_id   VARCHAR(255) NOT NULL, -- developer's own user ID
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, external_id)
);

-- Conversation Sessions
CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  app_user_id     UUID NOT NULL REFERENCES app_users(id),
  compressed_summary TEXT,
  turn_count      INTEGER DEFAULT 0,
  token_count     INTEGER DEFAULT 0,
  last_active_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Messages
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL, -- 'user' | 'assistant' | 'system'
  content       TEXT NOT NULL,
  token_count   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Memory Store (structured facts extracted from conversations)
CREATE TABLE memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id),
  app_user_id   UUID NOT NULL REFERENCES app_users(id),
  content       TEXT NOT NULL,        -- "User's name is Alex"
  category      VARCHAR(50),          -- 'personal' | 'preference' | 'goal' | 'context'
  confidence    FLOAT DEFAULT 1.0,
  embedding_id  VARCHAR(255),         -- ID in Qdrant
  source_session_id UUID REFERENCES sessions(id),
  expires_at    TIMESTAMPTZ,          -- NULL = never expires
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt Templates
CREATE TABLE prompt_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id),
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt Versions (immutable)
CREATE TABLE prompt_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES prompt_templates(id),
  version       VARCHAR(20) NOT NULL,  -- semver: "1.0.0"
  content       TEXT NOT NULL,
  variables     JSONB DEFAULT '[]',    -- ["userName", "productName"]
  deployment    VARCHAR(20) DEFAULT 'draft', -- 'draft' | 'staging' | 'production' | 'canary'
  canary_pct    INTEGER DEFAULT 0,     -- 0-100, traffic % in canary
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- LLM Call Logs (observability)
CREATE TABLE call_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id),
  session_id        UUID REFERENCES sessions(id),
  app_user_id       UUID REFERENCES app_users(id),
  prompt_version_id UUID REFERENCES prompt_versions(id),
  model             VARCHAR(100) NOT NULL,
  messages_payload  JSONB,            -- full context sent to LLM
  response_payload  JSONB,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  total_tokens      INTEGER,
  latency_ms        INTEGER,
  cost_usd          NUMERIC(10, 6),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_call_logs_project ON call_logs(project_id, created_at DESC);

-- Token Usage Aggregates (for billing + dashboards)
CREATE TABLE usage_daily (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id),
  date          DATE NOT NULL,
  model         VARCHAR(100),
  total_tokens  BIGINT DEFAULT 0,
  total_calls   INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(10, 4) DEFAULT 0,
  UNIQUE (project_id, date, model)
);

-- Routing Rules
CREATE TABLE routing_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id),
  priority      INTEGER NOT NULL,
  condition     JSONB NOT NULL,        -- { "messageLength": { "lt": 100 } }
  target_model  VARCHAR(100) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. API SPECIFICATION

**Base URL:** `https://api.contextos.dev/v1`  
**Auth:** `Authorization: Bearer <api_key>` on all endpoints

---

### 7.1 Chat (Core Endpoint)

```
POST /chat

Request:
{
  "userId": "user_123",          // required: developer's user ID
  "message": "hello",            // required
  "sessionId": "sess_abc",       // optional: continue existing session
  "model": "claude-sonnet-4-20250514", // optional: override routing
  "options": {
    "enableMemory": true,        // default: true
    "enableCompression": true,   // default: true
    "promptTemplateId": "uuid",  // optional: use versioned prompt
    "stream": false              // optional: SSE streaming
  }
}

Response:
{
  "response": "Hello! How can I help you today?",
  "sessionId": "sess_abc",
  "usage": {
    "promptTokens": 320,
    "completionTokens": 15,
    "totalTokens": 335,
    "model": "claude-haiku-4-5-20251001",
    "costUsd": 0.000067
  },
  "debug": {
    "memoriesInjected": 3,
    "wasCompressed": false,
    "promptVersion": "1.2.0"
  }
}
```

---

### 7.2 Memory Endpoints

```
GET    /memories?userId=user_123&limit=20&category=preference
POST   /memories          { userId, content, category }
PATCH  /memories/:id      { content?, category?, expires_at? }
DELETE /memories/:id
DELETE /memories?userId=user_123   // delete all memories for user (GDPR)
```

---

### 7.3 Sessions Endpoints

```
GET  /sessions?userId=user_123&limit=10
GET  /sessions/:id
GET  /sessions/:id/messages
DELETE /sessions/:id
```

---

### 7.4 Prompt Template Endpoints

```
GET    /prompts
POST   /prompts                  { name, description }
GET    /prompts/:id/versions
POST   /prompts/:id/versions     { content, variables }
PATCH  /prompts/:id/versions/:versionId  { deployment, canary_pct }
POST   /prompts/:id/rollback     { versionId }
```

---

### 7.5 Analytics Endpoints

```
GET /analytics/usage?from=2024-01-01&to=2024-01-31&groupBy=model
GET /analytics/costs?from=2024-01-01&to=2024-01-31
GET /analytics/calls?sessionId=xxx&limit=50
GET /analytics/calls/:callId
```

---

## 8. SDK SPECIFICATION

### 8.1 Installation

```bash
npm install @contextos/sdk
# or
yarn add @contextos/sdk
```

### 8.2 Initialization

```typescript
import { ContextOS } from '@contextos/sdk';

const ctx = new ContextOS({
  apiKey: process.env.CONTEXTOS_API_KEY,
  // Optional overrides:
  baseUrl: 'https://api.contextos.dev/v1',
  defaultOptions: {
    enableMemory: true,
    enableCompression: true,
  }
});
```

### 8.3 Core Methods

```typescript
// Basic chat
const response = await ctx.chat({
  userId: 'user_123',
  message: 'What was my name again?',
});
console.log(response.response); // "Your name is Alex"

// With session continuation
const response = await ctx.chat({
  userId: 'user_123',
  sessionId: response.sessionId,
  message: 'Follow-up question',
});

// Streaming
const stream = await ctx.chat({
  userId: 'user_123',
  message: 'Tell me a long story',
  options: { stream: true }
});
for await (const chunk of stream) {
  process.stdout.write(chunk.delta);
}

// Memory management
const memories = await ctx.memory.list('user_123');
await ctx.memory.delete(memoryId);
await ctx.memory.deleteAll('user_123'); // GDPR

// Prompt templates
const prompt = await ctx.prompts.resolve('my-template', {
  userName: 'Alex',
  productName: 'Acme'
});
```

### 8.4 Framework Integrations

```typescript
// Vercel AI SDK
import { contextosAdapter } from '@contextos/sdk/adapters/vercel-ai';
const model = contextosAdapter(ctx, { userId: session.userId });

// LangChain
import { ContextOSMemory } from '@contextos/sdk/adapters/langchain';
const memory = new ContextOSMemory({ client: ctx, userId: 'user_123' });
```

---

## 9. INFRASTRUCTURE & DEVOPS

### 9.1 Environments

| Environment | Purpose | Infrastructure |
|------------|---------|---------------|
| `development` | Local dev | Docker Compose |
| `staging` | Pre-prod testing | Railway (single instance) |
| `production` | Live traffic | Railway (auto-scale) + Vercel |

### 9.2 Docker Compose (Local Dev)

```yaml
version: '3.8'
services:
  api:
    build: ./apps/api
    ports: ["3001:3001"]
    env_file: .env.local
    depends_on: [postgres, redis, qdrant]

  dashboard:
    build: ./apps/dashboard
    ports: ["3000:3000"]
    env_file: .env.local

  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: contextos
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333"]
    volumes: ["qdrant_storage:/qdrant/storage"]

volumes:
  qdrant_storage:
```

### 9.3 Environment Variables

```bash
# API
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

JWT_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=          # for embeddings
ANTHROPIC_API_KEY=       # for default model
EMBEDDING_MODEL=text-embedding-3-small

# Billing (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Observability
AXIOM_TOKEN=
POSTHOG_KEY=
```

### 9.4 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: railway up --service api

  deploy-dashboard:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: vercel --prod
```

---

## 10. SECURITY & COMPLIANCE

### 10.1 Authentication & Authorization

- API keys are SHA-256 hashed before storage (same model as Stripe)
- Row-level security (RLS) in Supabase ensures projects only access their own data
- JWT tokens for dashboard sessions (15-min expiry + refresh)
- Rate limiting: 100 req/min free, 1000 req/min paid

### 10.2 Data Privacy

- All user memory data is scoped to the developer's `project_id`
- Developers can call `DELETE /memories?userId=xxx` for GDPR compliance
- Developers can enable `maskFields` to redact PII from logs
- Data residency: US by default, EU option for Pro plan
- Encryption at rest (Supabase default) + in transit (TLS 1.3)

### 10.3 Sensitive Data Handling

```typescript
// Developer can configure PII masking
const ctx = new ContextOS({
  apiKey: '...',
  privacy: {
    maskFields: ['email', 'phone', 'ssn'],
    maskPattern: /\b\d{3}-\d{2}-\d{4}\b/g  // custom regex
  }
});
```

---

## 11. BUILD ROADMAP

### Sprint 0 — Repo & Infra Setup (Week 1)
- [ ] Monorepo setup (Turborepo: `apps/api`, `apps/dashboard`, `packages/sdk`)
- [ ] Docker Compose local dev environment
- [ ] Supabase project + DB migrations
- [ ] Qdrant cloud setup + collection creation
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment variable management

### Sprint 1 — MVP Core (Weeks 2–4)
- [ ] `POST /chat` endpoint (proxy to LLM, no memory yet)
- [ ] API key auth + project model
- [ ] Memory extraction worker (BullMQ job)
- [ ] Memory storage in Qdrant
- [ ] Memory retrieval + injection into context
- [ ] SDK: `ctx.chat()` method
- [ ] Basic call logging to PostgreSQL

### Sprint 2 — Context Features (Weeks 5–6)
- [ ] Context compression (rolling summary)
- [ ] Session management (create, continue, list)
- [ ] Token counting + cost calculation
- [ ] `GET /sessions` + `GET /sessions/:id/messages`

### Sprint 3 — Dashboard MVP (Weeks 7–8)
- [ ] Auth (Supabase Auth, email + Google)
- [ ] Project creation + API key display
- [ ] Memory viewer (list, edit, delete)
- [ ] Context debugger (call log timeline)
- [ ] Basic token usage chart

### Sprint 4 — Prompt Versioning (Weeks 9–10)
- [ ] Prompt template CRUD
- [ ] Version history (immutable)
- [ ] Deploy to staging/production
- [ ] Rollback UI

### Sprint 5 — Cost Optimizer (Weeks 11–12)
- [ ] Model routing rules engine
- [ ] Budget caps per user
- [ ] A/B testing traffic split
- [ ] Cost dashboard + CSV export

### Sprint 6 — Launch Prep (Weeks 13–14)
- [ ] Stripe billing integration (free/starter/pro)
- [ ] Usage limit enforcement per plan
- [ ] SDK framework adapters (Vercel AI, LangChain)
- [ ] Documentation site (Mintlify)
- [ ] Public launch (Product Hunt)

---

## 12. OPEN QUESTIONS

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| 1 | Should memory extraction use OpenAI or Anthropic? Need cost/quality benchmark. | Engineering | High |
| 2 | Should Qdrant be self-hosted (Railway) or Qdrant Cloud? Self-host is cheaper but ops burden. | Infra | High |
| 3 | Multi-tenancy: single Qdrant collection per project vs. one global collection + filter? | Engineering | High |
| 4 | What memory categories to support out of the box? (personal, preference, goal, context — enough?) | Product | Medium |
| 5 | Webhooks for memory events? (e.g., notify developer when new memory is created) | Product | Low |
| 6 | Should the SDK support browser/edge environments, or Node.js only for MVP? | Engineering | Medium |
| 7 | EU data residency: separate Supabase + Qdrant instances, or row-level region tagging? | Compliance | Medium |

---

*Document prepared for AI-agent-assisted development. Each section is self-contained and implementable independently.*
