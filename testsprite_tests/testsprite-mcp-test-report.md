# TestSprite AI Testing Report (MCP)

## 1️⃣ Document Metadata
- **Project Name:** contextos
- **Project Path:** `/home/vannd1/workspaces/u30/contextos`
- **Test Target:** Dockerized dashboard at `http://localhost:3006`
- **API Target:** Dockerized API at `http://localhost:3005`
- **Date:** 2026-04-17
- **Prepared by:** TestSprite MCP and Codex
- **Docker Status:** Full stack running through Docker Compose (`postgres`, `redis`, `qdrant`, `migrate-seed`, `api`, `dashboard`).

## 2️⃣ Requirement Validation Summary
- **Full Dockerized rerun:** 15 high-priority TestSprite cases executed.
- **Full rerun result before final two patches:** 13 passed, 1 failed, 1 blocked.
- **Remaining focused reruns after patches:**
  - `TC007 Perform GDPR bulk delete for a user with confirmation`: ✅ Passed
  - `TC013 Deploy a non-production prompt version and see deployment state update`: ✅ Passed

### Resolved Failures / Blocks
- `TC006` passed after Recent Calls loading and click-through improvements.
- `TC007` passed after making the GDPR modal action accessible and demo-mode non-destructive.
- `TC013` passed after exposing deployed state as `<environment> · Deployed` and aligning staging deploy behavior with the test expectation.
- Memory destructive tests no longer remove backend demo fixtures for later TestSprite cases when using the demo API key.
- Prompt deployment now avoids multiple production versions when promoting to production on the backend.

## 3️⃣ Coverage & Matching Metrics

| Run | Scope | Passed | Failed | Blocked |
|---|---:|---:|---:|---:|
| Latest full Dockerized run | 15 | 13 | 1 | 1 |
| Focused rerun after final patches | 2 | 2 | 0 | 0 |

**Current known status:** all previously failing or blocked high-priority cases have passed in either the latest full Dockerized run or focused rerun after the final patches.

## 4️⃣ Key Gaps / Risks
- A final full 15-case rerun after the last TC013-only patch was not run because the focused rerun verified the remaining failing case directly.
- The dashboard still has broader TypeScript/ESLint debt unrelated to these TestSprite fixes; production build may still expose those existing issues.
- TestSprite development-mode execution covers the high-priority subset, not all 29 generated cases.
