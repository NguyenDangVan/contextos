# ContextOS — The Memory Layer for LLM Apps

> Drop-in SDK + Dashboard that gives every LLM app **persistent memory**, **cost optimization**, and **full observability** — in under 10 minutes.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![TypeScript](https://img.shields.io/badge/typescript-5.5-blue)

---

## 🎯 Problem

Every LLM app re-invents the same infrastructure:
- **Memory management** — "Remember the user said X three conversations ago"
- **Context compression** — "My 128k token window is full, now what?"
- **Cost tracking** — "We burned $2,000 in tokens yesterday, but on what?"
- **Prompt versioning** — "Which version of the system prompt is in production?"

ContextOS solves all of this as a **single API layer** between your app and any LLM.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **Persistent Memory** | Auto-extracts and retrieves user facts via semantic search (Qdrant) |
| 📦 **Context Compression** | Summarizes old turns to fit context windows, keeps recent turns intact |
| 📝 **Prompt Version Control** | Git-like versioning with draft → staging → production → canary deployment |
| 📊 **Full Observability** | Token usage, cost tracking, latency metrics, context debugger |
| 🔀 **Smart Routing** | Route to different models based on message properties |
| 💰 **Budget Caps** | Per-user monthly token limits |
| 🛡️ **GDPR Compliance** | Bulk memory deletion per user |
| 🎛️ **Dashboard** | Premium dark-theme control center for all the above |

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Your App   │────▶│ ContextOS API│────▶│   LLM API   │
│  (SDK)      │◀────│  (Fastify)   │◀────│ (OpenAI/    │
└─────────────┘     └──────┬───────┘     │  Anthropic) │
                           │             └─────────────┘
                    ┌──────┴───────┐
                    │              │
              ┌─────▼─────┐ ┌─────▼─────┐
              │ PostgreSQL │ │  Qdrant   │
              │ (state)    │ │ (vectors) │
              └───────────-┘ └───────────┘
                    │
              ┌─────▼─────┐
              │   Redis    │
              │ (queues)   │
              └───────────-┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20
- Docker & Docker Compose

### 1. Clone & Install

```bash
git clone https://github.com/your-org/contextos.git
cd contextos
npm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
# Starts PostgreSQL, Redis, Qdrant
```

### 3. Run Migrations & Seed

```bash
cd apps/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/contextos npx knex migrate:latest --knexfile knexfile.ts
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/contextos npx knex seed:run --knexfile knexfile.ts
```

### 4. Start API + Dashboard

```bash
# Terminal 1: API Server
cd apps/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/contextos \
REDIS_URL=redis://localhost:6380 \
QDRANT_URL=http://localhost:6335 \
API_PORT=3005 npx tsx src/index.ts

# Terminal 2: Dashboard
cd apps/dashboard
PORT=3006 npx next dev
```

### 5. Try It!

```bash
# Health check
curl http://localhost:3005/health

# Send a chat message
curl -X POST http://localhost:3005/v1/chat \
  -H "Authorization: Bearer ctx_demo_key_2026_hackathon_testsprite" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_123","message":"Hi, my name is Alex!"}'

# Open Dashboard
open http://localhost:3006
```

## 📦 SDK Usage

```typescript
import { ContextOS } from '@contextos/sdk';

const ctx = new ContextOS({
  apiKey: 'ctx_demo_key_2026_hackathon_testsprite',
  baseUrl: 'http://localhost:3005/v1',
});

// Chat with automatic memory
const response = await ctx.chat({
  userId: 'user_123',
  message: 'Hello! Remember my name is Alex.',
});
console.log(response.response);
// → "Hi Alex! I'll remember your name."

// Later conversation — memory persists
const response2 = await ctx.chat({
  userId: 'user_123',
  message: 'What is my name?',
  sessionId: response.sessionId,
});
console.log(response2.response);
// → "Your name is Alex!"

// Manage memories
const memories = await ctx.memory.list('user_123');
await ctx.memory.create('user_123', { content: 'Prefers dark mode', category: 'preference' });

// GDPR delete
await ctx.memory.deleteAll('user_123');

// Analytics
const usage = await ctx.analytics.usage('2026-04-01', '2026-04-17');
const costs = await ctx.analytics.costs('2026-04-01', '2026-04-17');
```

## 🗂️ Project Structure

```
contextos/
├── apps/
│   ├── api/              # Fastify API server
│   │   ├── src/
│   │   │   ├── services/ # Business logic (LLM, Memory, Compression, Routing, Prompts, Analytics)
│   │   │   ├── routes/   # API endpoints (chat, memories, sessions, prompts, analytics)
│   │   │   ├── workers/  # BullMQ background workers
│   │   │   └── middleware/ # Auth
│   │   └── migrations/   # PostgreSQL schema (10 tables)
│   └── dashboard/        # Next.js 14 admin UI
│       └── src/app/      # Pages: Overview, Memory, Sessions, Prompts, Debugger, Analytics, Settings
├── packages/
│   └── sdk/              # TypeScript SDK (zero runtime deps)
└── docker-compose.yml    # PostgreSQL + Redis + Qdrant
```

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/chat` | Send message with auto memory + compression |
| `GET` | `/v1/memories` | List memories (filter by userId, category) |
| `POST` | `/v1/memories` | Create manual memory |
| `DELETE` | `/v1/memories/:id` | Delete single memory |
| `DELETE` | `/v1/memories?userId=x` | GDPR bulk delete |
| `GET` | `/v1/sessions` | List sessions |
| `GET` | `/v1/sessions/:id/messages` | Get message history |
| `GET` | `/v1/prompts` | List prompt templates |
| `POST` | `/v1/prompts/:id/versions` | Create new version |
| `PATCH` | `/v1/prompts/:id/versions/:vid` | Deploy version |
| `GET` | `/v1/analytics/usage` | Token usage stats |
| `GET` | `/v1/analytics/costs` | Cost breakdown |
| `GET` | `/v1/analytics/calls/:id` | Context debugger |

## 🧪 Mock Mode

When no LLM API keys are configured, ContextOS automatically operates in **mock mode**:
- Chat responses are contextual but simulated
- Embeddings use deterministic pseudo-random vectors from text hashes
- All system logic (memory extraction, compression, routing) still executes
- Perfect for development, testing, and hackathon demos

## 🛠️ Tech Stack

- **API**: Node.js, Fastify, TypeScript
- **Database**: PostgreSQL 16 (state), Qdrant (vectors), Redis 7 (queues)
- **Dashboard**: Next.js 14, React 18, Recharts
- **SDK**: TypeScript, zero dependencies
- **Workers**: BullMQ (memory extraction, log processing)

## 📄 License

MIT © ContextOS Team
