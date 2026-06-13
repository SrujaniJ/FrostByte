# Frostbyte

A browser-based social-hub game — make an avatar, walk around a shared town, chat, and play a
minigame for coins — built with a deliberate focus on **security engineering**. The flagship
features are a server-authoritative game model (anti-cheat) and an AI-assisted chat-moderation
pipeline (Trust & Safety).

> Original work, inspired by the *social-hub* game genre. Not affiliated with, endorsed by, or
> derived from any existing product; all names, art, and assets are original. See [Notes](#notes).

## What it demonstrates

- **Server-authoritative state / anti-cheat.** The browser is treated as untrusted. Scores, coins,
  inventory, and position are decided or validated on the server — the client cannot dictate them.
- **Trust & Safety moderation pipeline.** Every chat message passes through rate limiting → a
  rules/PII pre-filter → an LLM classifier → a logged allow/block decision, with a documented
  fail-closed policy and graceful degradation when the model is unavailable.
- **Authentication & session security.** Argon2 password hashing, secure session cookies, CSRF
  protection, and login rate limiting / lockout.
- **A written threat model.** See [`SECURITY.md`](./SECURITY.md).

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite (deployed on Vercel) |
| Backend | Python + FastAPI (deployed on Render) |
| Database | PostgreSQL (Neon, serverless) |
| AI moderation | Groq API (`llama-3.1-8b-instant`) |
| Auth | Argon2 hashing + secure session cookies |

All infrastructure runs on free tiers. No secrets are stored in the repository; configuration is
via environment variables.

## Architecture (overview)

```
Browser (React, untrusted)
   │ HTTPS / JSON
FastAPI backend  ── trust boundary: authn, authz, validation, rate limits
   │                    │
PostgreSQL (Neon)   Groq API (moderation; output treated as untrusted data)
```

The full request/data flows are documented in [`docs/03_AppFlow.md`](./docs/03_AppFlow.md), and the
security design in [`SECURITY.md`](./SECURITY.md).

## Project status & roadmap

**v1 (in progress):** accounts, avatar customization, one shared room with click-to-move, moderated
chat, one minigame with server-validated scoring, a coin economy, and abuse reporting.

**Deferred to later versions:** real-time multiplayer (WebSockets), personal rooms, multiple rooms,
friends, additional minigames, mobile layout. These are intentionally out of scope for v1 — see
[`docs/06_Roadmap.md`](./docs/06_Roadmap.md).

## Running locally

> Placeholder — fill in as the code lands.

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set DATABASE_URL, GROQ_API_KEY, SESSION_SECRET, etc.
alembic upgrade head
uvicorn app.main:app --reload

# frontend
cd frontend
npm install
cp .env.example .env          # set VITE_API_BASE_URL
npm run dev
```

Required environment variables are listed in each `.env.example`. **Never commit a real `.env`.**

## Documentation

- [`docs/01_PRD.md`](./docs/01_PRD.md) — product requirements & scope
- [`docs/02_TRD.md`](./docs/02_TRD.md) — technical requirements & stack rationale
- [`docs/03_AppFlow.md`](./docs/03_AppFlow.md) — user journeys & data flows
- [`docs/04_UX_UI_Design.md`](./docs/04_UX_UI_Design.md) — UI design notes
- [`docs/05_Data_Schema.md`](./docs/05_Data_Schema.md) — database schema
- [`docs/06_Roadmap.md`](./docs/06_Roadmap.md) — build milestones
- [`SECURITY.md`](./SECURITY.md) — threat model & security design
