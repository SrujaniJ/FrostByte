# Roadmap — Frostbyte

Build milestones for the v1 release. The plan front-loads the security-critical work
(authentication, anti-cheat, moderation) so the core of the project is solid early, and keeps the
"world" layer thin. If schedule pressure arises, polish and the shop are trimmed before any security
work.

## Phase 0 — Setup & spike

- Create repositories and project structure.
- Provision Vercel, Render, Neon, and Groq; verify current free-tier terms.
- Prove the pipeline end to end: a deployed FastAPI endpoint on Render, reached from a Vercel React
  page, connected to Neon, with one successful Groq call.
- Record the key design decisions (session strategy, auth approach, score-validation method).
- Set up Alembic, environment-variable handling, CORS locked to the frontend origin, and base
  security headers.

Outcome: an empty but deployed, connected, HTTPS stack.

## Phase 1 — Authentication & identity

- `users` and `sessions` tables + migrations.
- Register (Argon2 hashing, username validation, starter items + 0 coins).
- Login (hash verification, secure session cookie, failed-attempt lockout), logout, `/me`.
- CSRF protection; login rate limiting.
- Frontend: Landing, Auth, session-aware routing, cold-start loading state.
- Document the authentication threat model.

Checkpoint: register/login/logout work on the live URL; a database dump exposes no usable
credentials; session forgery/fixation attempts fail.

## Phase 2 — Minigame, scoring & economy (anti-cheat)

- `game_sessions` and `coin_transactions` tables.
- `start` issues a one-time nonce + start time.
- A small browser minigame.
- `finish` validates the nonce, computes the authoritative score, awards coins transactionally, and
  burns the nonce.
- Shop: `items`, `item_ownership`, `GET /shop`, `POST /shop/buy` (transactional, idempotent).
- Self-test adversarially: attempt to submit a fake score, replay a nonce, buy without funds, and
  double-buy; fix anything that works, and document each attack and its defense.

Checkpoint: scores and coins cannot be manipulated from the client.

## Phase 3 — Chat & AI moderation (flagship)

- `chat_messages` and `moderation_log` tables.
- Rules/PII pre-filter (wordlist + email/phone patterns).
- Groq integration (`llama-3.1-8b-instant`) returning a strict JSON verdict; output treated as
  untrusted.
- Pipeline: rate-limit → rules → (if clean) LLM → decision → store-or-block → always log.
- Fail-closed-on-LLM degradation handling and logging; one LLM call per accepted message.
- Frontend: chat panel, slow poll, blocked-message notice.
- Document the moderation/Trust & Safety design and fail policy.

Checkpoint: abusive/PII messages are blocked and logged; clean messages pass; a simulated LLM outage
degrades gracefully.

## Phase 4 — World, reporting, hardening & release

- `avatars` + Avatar Setup; server-validated customization.
- Town room: render avatar, click-to-move (validated), ghost/NPC presence via slow poll.
- Report flow + `reports` table + authorization-gated admin review + `audit_log`.
- Security pass: dependency scan, header check, CORS check, object-level authorization tests.
- Finalize README and SECURITY.md; final deploy and full-journey smoke test.

Checkpoint: v1 done (per PRD §4).

## Possible later hardening / features

1. Full server-side event replay for scoring (stronger anti-cheat).
2. Severity-based moderation responses (throttling vs hard block).
3. A 2D engine (Phaser/Kaplay) for richer movement.
4. Real-time multiplayer (WebSockets) — note this likely requires hosting beyond the current free
   tier and is a larger, separate effort.
