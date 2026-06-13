# App Flow — Frostbyte

User journeys and data flows. Kept in sync with the API surface in the TRD.

## 1. Navigation states

```
[Landing] --register/login--> [Auth] --success--> [Avatar Setup (first time)] --> [Town]
[Town] <---> [Minigame]
[Town] <---> [Shop]
[Town] --logout--> [Landing]
```

A returning user with a valid session cookie goes straight to the Town.

## 2. Core journeys

### First-time user
1. Landing → "Play".
2. Register (username + password); the server hashes with Argon2, creates the user with starter
   items and 0 coins, and sets a session cookie.
3. Avatar setup (base + color); choices validated server-side.
4. Enter the Town.

### Returning user
- Valid session cookie → `/me` succeeds → Town. Otherwise → Auth.

### Chat (moderated path)
```
User types -> client length/format check -> POST /chat/town
  -> authenticated? -> rate-limit ok?
       -> rules / PII pre-filter
            -> clean by rules -> LLM classify
                 -> clean   -> store + 200 -> appears for others on next poll
                 -> flagged -> 422 + reason -> user notice -> audit-log entry
            -> blocked by rules -> 422 + reason -> audit-log entry
  -> (LLM error / rate-limited) -> degrade to rules-only -> log degradation -> apply fail-closed policy
```

### Minigame (anti-cheat path)
```
POST /game/bean/start  -> server issues one-time nonce + start time
(client plays; records gameplay events)
POST /game/bean/finish {session_id, events}
  -> validate nonce (unused, owned, within time bounds) and event plausibility
  -> server computes authoritative score, awards coins transactionally, burns nonce
  -> return authoritative score + new balance
The client never sends a score; a client-claimed score is ignored.
```

### Shop / economy
- `GET /shop` returns items, prices, and ownership.
- `POST /shop/buy {item_id}` verifies balance, then grants the item and deducts coins in one
  transaction. Ownership is keyed to prevent duplicate grants; the coin change is transactional.

### Report abuse
- `POST /report {message_id, reason}` stores a report (rate-limited per user).
- An admin opens the authorization-gated `/admin/reports` queue and can hide a message, which writes
  to the audit log.

## 3. Presence model (v1, no real-time)

- Entering the Town returns the player's position plus recently-active avatars (rendered as static
  "ghost" figures) and any NPCs.
- Movement posts a bounds-checked position; other avatars refresh on a slow poll. Real-time presence
  is deferred to a later version.

## 4. Error & edge states

- **Server waking up** (cold start): loading state + retry.
- **Chat blocked:** inline, non-judgemental notice; the blocked text is not echoed publicly.
- **Moderation degraded:** handled server-side; invisible to users; logged.
- **Session expired:** redirect to Auth; no sensitive state retained client-side.
- **Rate-limited:** friendly "slow down" message.
- **Insufficient coins:** the buy control is disabled, and the server re-checks regardless.

## 5. Trust boundaries

```
[ Browser / client ]   UNTRUSTED — validate everything from here.
        | HTTPS
[ FastAPI backend ]    Trust boundary: authn, authz, validation, rate limits.
        |                    |
   [ PostgreSQL ]      [ Groq API ]   LLM output is data to act on, not ground truth.
```

Guiding principle: **the browser is untrusted.** Every score, coin, position, and message is
decided or validated server-side.
