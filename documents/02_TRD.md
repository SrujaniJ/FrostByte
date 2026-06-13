# Technical Requirements Document — Frostbyte

## 1. Stack

All choices target free-tier hosting and a strong security story.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React + Vite on Vercel | Standard SPA tooling; Vercel's free tier suits a personal, non-commercial app. |
| Rendering | DOM + CSS in v1 (no game engine) | Keeps the client minimal so effort concentrates on the backend and security. A 2D engine (Phaser/Kaplay) is a later upgrade. |
| Backend | Python + FastAPI on Render | First-class request validation (Pydantic) and a clean security model. |
| Database | PostgreSQL on Neon (serverless) | Persistent free tier with connection pooling. Note: some providers' free databases expire after ~30 days — avoided here. |
| AI moderation | Groq API, `llama-3.1-8b-instant` | Fast inference and the highest free request budget; OpenAI-compatible SDK. Called only on chat sends, after a cheap pre-filter, to respect rate limits. |
| Secrets | Platform environment variables | Never committed to the repo or exposed to the client. |

**Topology:** Browser (Vercel SPA) → HTTPS JSON API (Render FastAPI) → Neon PostgreSQL; backend →
Groq for moderation. No WebSockets in v1; all interactions are request/response.

## 2. Security pillars

1. **Authentication & session security** — Argon2 hashing; httpOnly/Secure/SameSite session cookies
   (chosen over JWT for v1 for simpler, safer defaults); CSRF protection; login rate limiting.
2. **Authorization & server-authoritative state** — the client requests actions; the server decides
   outcomes. Coins, scores, inventory, and position are server-owned. Minigame scores are computed
   or bounds-checked server-side from a one-time nonce. Object-level authorization throughout.
3. **Input validation & injection defense** — Pydantic validation on every request; parameterized
   queries/ORM only; text-only chat escaped on render.
4. **Trust & Safety moderation** — layered rate-limit → rules/PII → LLM → decision → audit log, with
   a documented fail-closed-on-LLM policy.
5. **Secure deployment** — HTTPS, security headers (CSP, etc.), CORS locked to the frontend origin,
   dependency scanning.
6. **Logging, audit & reporting** — append-only moderation and audit logs; rate-limited user reports;
   authorization-gated admin review.

See [`../SECURITY.md`](../SECURITY.md) for the full threat model.

## 3. API surface (v1)

```
POST /auth/register     {username, password}            -> set session cookie
POST /auth/login        {username, password}            -> set session cookie
POST /auth/logout                                        -> clears session
GET  /me                                                 -> profile, coins, avatar, items

GET  /room/town                                          -> room state + recent presence
POST /room/town/move    {x, y}                           -> validated position update

GET  /chat/town?since=...                                -> recent visible messages
POST /chat/town         {text}                           -> moderated; 200 stored | 422 blocked

POST /game/{game}/start                                  -> session_id (nonce)
POST /game/{game}/finish {session_id, events[]}          -> server-validated score + coins

GET  /shop                                               -> items + prices
POST /shop/buy          {item_id}                        -> server checks coins, grants item

POST /report            {message_id, reason}             -> queued for review
GET  /admin/reports     (admin only)                     -> list (authorization-gated)
```

All endpoints are authenticated (except register/login), rate-limited, and schema-validated.

## 4. Non-functional requirements

- **Cold-start tolerance:** the free backend tier may take ~30–60s to wake after idle; the UI shows
  a loading state and retries.
- **LLM budget:** at most one moderation call per accepted message; identical recent strings cached;
  no LLM calls outside the chat path.
- **DB connections:** use the pooled connection string; keep the pool small.
- **Secret isolation:** the moderation API key lives only on the backend; the client never sees it.

## 5. Documented design decisions

- **Database/auth:** own authentication on Neon PostgreSQL was chosen over a managed auth provider to
  keep authentication logic explicit and reviewable. (A provider with row-level security was
  evaluated as an alternative.)
- **Sessions:** cookie-based sessions chosen over JWT for v1 (simpler revocation and safer defaults).
- **Score validation:** bounds + single-use nonce in v1; full server-side event replay is a possible
  later hardening step.
