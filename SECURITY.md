# Security Model — Frostbyte

This document describes the threat model and the security design of Frostbyte. Security is the
primary engineering focus of the project, so this file is intended to be read alongside the code.

## Core principle

**The browser is untrusted.** Anything arriving from a client is treated as potentially hostile
until validated server-side. All trust-sensitive state — scores, coins, inventory, position, and
chat moderation decisions — is decided or validated on the server. The client may *request* an
action; it never *dictates* an outcome.

## Trust boundaries

```
[ Browser / client ]      UNTRUSTED. Hostile until proven otherwise.
        │ HTTPS
[ FastAPI backend ]       Trust boundary enforced here:
        │   │              authentication, authorization, input validation, rate limiting.
        │   │
[ PostgreSQL ]      [ Groq API ]   External LLM output is treated as data to act on,
                                    not as ground truth to trust blindly.
```

## Security pillars

### 1. Authentication & session security
- Passwords hashed with **Argon2**; plaintext and fast unsalted hashes are never used. A database
  dump does not expose usable credentials.
- Sessions use **httpOnly, Secure, SameSite** cookies with opaque, random identifiers; sessions are
  revocable (logout / forced revoke) and rotated on privilege change.
- **CSRF** protection on state-changing requests.
- **Login rate limiting / lockout** to blunt credential brute-forcing.

### 2. Authorization & server-authoritative state (anti-cheat)
- Object-level authorization: a user can only read/modify their own avatar, coins, and inventory.
  The "act as another user" case is tested explicitly.
- **Coins** are never set from a request. Every balance change is an entry in `coin_transactions`
  written in the same database transaction that updates the balance, with a `CHECK (coins >= 0)`
  constraint. The balance is reconcilable against the transaction log.
- **Minigame scoring** is server-authoritative:
  1. `start` issues a one-time, user-bound nonce and records a start time.
  2. The client submits *gameplay events*, never a final score.
  3. The server validates the nonce (unused, owned, within time bounds), computes (or bounds-checks)
     the score itself, awards coins transactionally, and burns the nonce.
  - Forged scores, replayed sessions, and out-of-bounds results are rejected at this layer.

### 3. Input validation & injection defense
- Every request body is validated by a strict schema (Pydantic); unknown and oversized fields are
  rejected.
- Database access uses parameterized queries / an ORM only — no string-built SQL.
- Chat is text-only and escaped on render; no raw HTML injection from user content.

### 4. Trust & Safety: chat moderation pipeline
Every chat message flows through:

```
rate limit  →  rules / PII pre-filter  →  (if clean) LLM classifier  →  decision  →  audit log
```

- **Rules / PII pre-filter:** wordlist + patterns for emails, phone numbers, and similar PII.
  Cheap, deterministic, and the fallback when the LLM is unavailable.
- **LLM classifier (Groq):** returns a category and severity (e.g. `clean`, `harassment`, `pii`,
  `unsafe`, `spam`). Output is parsed strictly and treated as untrusted data, not as authority.
- **Decision & logging:** every evaluation writes a `moderation_log` row (rules verdict, whether the
  LLM was called, its category/severity, the final decision, and whether the pipeline ran in a
  degraded state). Only allowed messages are stored as chat.
- **Degradation policy:** if the LLM errors or is rate-limited, the pipeline degrades to rules-only
  and logs the degradation. The model tier is **fail-closed** (a message that cannot be classified
  is blocked), while rules-clean messages are allowed — chosen because the app is framed for an
  all-ages audience and over-blocking is preferable to under-blocking here.
- **Budget awareness:** the LLM is called at most once per accepted message, after the cheap filter,
  to respect provider rate limits.

### 5. Secure deployment
- HTTPS everywhere.
- Security response headers: Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy`,
  and HSTS.
- CORS restricted to the known frontend origin.
- Secrets supplied via environment variables only; never committed.
- Dependency scanning (`pip-audit` / Dependabot).

### 6. Logging, audit & abuse reporting
- Append-only `moderation_log` (content decisions) and `audit_log` (privileged actions such as
  hiding a message or locking an account).
- User-initiated reports are stored and rate-limited to prevent report-spam, and surfaced to an
  authorization-gated admin review view.
- Logs avoid storing unnecessary PII.

## Threats considered (summary)

| Threat | Mitigation |
|--------|------------|
| Credential theft from DB dump | Argon2 hashing; no plaintext/weak hashes |
| Brute-force login | Rate limiting + account lockout |
| Session hijack / fixation | httpOnly/Secure/SameSite cookies, opaque IDs, rotation, revocation |
| CSRF | Anti-CSRF tokens / SameSite + custom header |
| Score forgery | Server-computed scores from a one-time, time-bound, user-bound nonce |
| Replay of a winning session | Nonce burned on first `finish` |
| Coin manipulation | Server-only balance changes; transactional; `CHECK (coins >= 0)` |
| Buying without funds / double-buy | Transactional purchase; ownership primary key prevents duplicates |
| Acting as another user | Object-level authorization checks |
| SQL injection | Parameterized queries / ORM |
| XSS via chat | Strict text validation + output escaping |
| Abusive / unsafe / PII chat | Layered moderation pipeline + audit log |
| LLM outage abused to bypass filter | Fail-closed on the LLM tier; rules fallback; degradation logged |
| Report-spam | Per-user report rate limiting |
| Secret leakage | Env-var configuration; secrets never in the repo or client |

## Reporting a vulnerability

This is a personal learning project, but responsible disclosure is welcome. If you find a security
issue, please open a private report (or contact the maintainer) rather than a public issue, and
allow reasonable time to address it before disclosure.
