# Product Requirements Document — Frostbyte

> Original work inspired by the social-hub game genre. All names, art, and assets are original and
> the project is not affiliated with any existing product. See the Notes section.

## 1. Summary

A browser-based social-hub game — a small persistent world where players create an avatar, walk
around a shared town, chat, and play a minigame for coins — built with a focus on **security
engineering**, featuring an **AI-assisted chat-moderation pipeline** as its flagship feature.

## 2. Goals

1. Demonstrate applied security engineering across authentication, anti-cheat, and Trust & Safety.
2. Ship a focused, working v1 on free-tier infrastructure.
3. Use AI where it is genuinely justified (content moderation), not decoratively.

Non-goals: monetization, breadth of content, or operating as a live service for minors (see §9).

## 3. Framing

This is a demonstration product with test accounts. The genre implies a young audience, and the
moderation system is *designed as if* protecting an all-ages audience, but the project does not
collect real children's data or market to minors. This keeps it clear of child-data regulatory
obligations while still exercising a realistic moderation design.

## 4. Scope — v1

| # | Feature | Security angle it showcases |
|---|---------|------------------------------|
| F1 | Account register / login / logout | Password hashing, session security, CSRF |
| F2 | Avatar creation + customization (color + items) | Server-side validation of owned items |
| F3 | One shared room ("The Town") with click-to-move | — |
| F4 | Async presence (recently-online avatars as ghosts; optional NPCs) | — |
| F5 | Chat, every message moderated before storage/display | AI + rules moderation, T&S pipeline, audit log |
| F6 | One minigame with server-authoritative scoring | Anti-cheat: never trust the client |
| F7 | Coin economy (earn from F6, spend on F2 items) | Server-authoritative economy, transaction integrity |
| F8 | Abuse-report button + moderation/audit log | Logging, accountability, rate limiting |

**Definition of "v1 done":** a deployed app where a user can register, log in, customize an avatar,
move within one room, send chat that is moderated, play one minigame whose score the server
validates, earn coins, buy an item, and report a message — plus a written threat model.

## 5. Deferred to later versions

- Real-time multiplayer (WebSockets)
- Personal rooms / igloos
- Multiple rooms / a map
- Friends, parties, messaging
- Additional minigames
- Mobile layout
- Sound / music

These are intentionally out of scope for v1 to keep the initial release focused.

## 6. Flagship feature: chat moderation (F5)

Every chat message flows: **client → backend → rate-limit → rules/PII pre-filter → LLM classifier →
decision → store + show, or block + log.**

- **Rules pre-filter:** wordlist + PII patterns (emails, phone numbers). Deterministic and free; the
  fallback if the LLM is unavailable.
- **LLM classifier** (`llama-3.1-8b-instant` on Groq): returns a category + severity. Invoked only
  for messages that pass the cheap filter, to respect provider rate limits.
- **Decision policy:** clean → store/show; flagged → block + user notice + audit-log entry.
- **Fail-safe:** on LLM error or rate-limit, degrade to rules-only and log it. The model tier is
  fail-closed (unclassifiable → blocked) while rules-clean messages are allowed.

## 7. Success criteria

- Deploys and stays reachable on a public URL.
- A documented threat model exists and matches the implementation.
- Each security pillar is demonstrable.

## 8. Risks & mitigations

- **Scope creep on visuals.** Mitigation: rendering kept deliberately simple in v1 (DOM + CSS, no
  game engine); the build plan front-loads the security-critical work.
- **Free-tier constraints** (database expiry on some providers, cold starts, LLM rate caps).
  Mitigation: the chosen stack routes around these (see TRD); free-tier terms are verified at setup.

## 9. Constraints & ethics

- Original name, art, and world; mechanics inspired by the genre only.
- No real-minor users and no real children's PII; demonstration/test accounts only.
