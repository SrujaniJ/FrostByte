# Data Schema — Frostbyte (PostgreSQL)

Relational schema for v1. The server owns all trust-sensitive state (coins, scores, ownership,
moderation verdicts). Access uses an ORM (SQLAlchemy) or parameterized SQL — never string-built
queries.

## Entity overview

```
users 1───1 avatars
users 1───* item_ownership *───1 items
users 1───* chat_messages
users 1───* game_sessions
users 1───* coin_transactions
users 1───* reports (as reporter)
chat_messages 1───* reports
chat_messages 1───1 moderation_log
users 1───* audit_log (as actor)
```

## Tables

### users
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| username | citext unique | case-insensitive unique; format-validated |
| password_hash | text | Argon2 hash only |
| role | text | `player` \| `admin`; gates `/admin/*` |
| coins | integer | server-authoritative; default 0; `CHECK (coins >= 0)` |
| created_at | timestamptz | |
| last_seen_at | timestamptz | drives presence |
| is_locked | boolean | login lockout |
| failed_login_count | integer | reset on success |

### avatars
| column | type | notes |
|--------|------|-------|
| user_id | uuid PK/FK -> users | one per user |
| base | text | allowed bases only (validated) |
| color | text | allowed palette only |
| pos_x, pos_y | integer | last position; bounds-checked |

### items (catalog)
| column | type | notes |
|--------|------|-------|
| id | text PK | e.g. `hat_red` |
| name | text | |
| price | integer | `CHECK (price >= 0)` |
| slot | text | e.g. `hat`, `color` |
| is_starter | boolean | granted free at signup |

### item_ownership
| column | type | notes |
|--------|------|-------|
| user_id | uuid FK | |
| item_id | text FK | |
| acquired_at | timestamptz | |
| PK (user_id, item_id) | | prevents duplicate grants |

### chat_messages
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| room | text | `town` in v1 |
| text | text | stored only if moderation allowed it |
| created_at | timestamptz | |
| is_hidden | boolean | admin can hide post-hoc |

Only allowed messages are stored here; blocked attempts are recorded in `moderation_log`.

### moderation_log (append-only)
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | author |
| message_id | uuid FK nullable | set if a message was created |
| raw_text_hash | text | hash rather than raw PII |
| rules_verdict | text | `clean` \| `blocked_wordlist` \| `blocked_pii` \| ... |
| llm_called | boolean | |
| llm_category | text nullable | `clean`/`harassment`/`pii`/`unsafe`/`spam`/... |
| llm_severity | text nullable | |
| final_decision | text | `allow` \| `block` |
| degraded | boolean | true if LLM unavailable and rules-only used |
| created_at | timestamptz | |

### game_sessions (anti-cheat nonce store)
| column | type | notes |
|--------|------|-------|
| id | uuid PK | one-time `session_id` / nonce |
| user_id | uuid FK | |
| game | text | `bean` (v1) |
| started_at | timestamptz | for time-bound validation |
| finished_at | timestamptz nullable | |
| status | text | `open` \| `completed` \| `rejected` |
| awarded_score | integer nullable | server-computed |
| awarded_coins | integer nullable | server-computed |

A nonce can be finished exactly once; replays and forged scores are rejected here.

### coin_transactions
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| delta | integer | +earn / -spend |
| reason | text | `game_reward` \| `purchase:<item>` |
| ref_id | uuid nullable | game_session or purchase id |
| created_at | timestamptz | |

`users.coins` equals the sum of `delta`; the balance update and the transaction insert occur in one
database transaction.

### reports
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| reporter_id | uuid FK | |
| message_id | uuid FK | |
| reason | text | bounded enum |
| status | text | `open` \| `actioned` \| `dismissed` |
| created_at | timestamptz | |

### audit_log (append-only; privileged actions)
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| actor_id | uuid FK | usually an admin |
| action | text | `hide_message` \| `lock_user` \| ... |
| target | text | affected row id |
| created_at | timestamptz | |

### sessions (server-side session cookies)
| column | type | notes |
|--------|------|-------|
| id | uuid PK | opaque, random cookie value (httpOnly) |
| user_id | uuid FK | |
| created_at / expires_at | timestamptz | rotate on privilege change |
| revoked | boolean | logout / forced revoke |

## Integrity rules enforced in code

- Coins are never set directly from a request; always via a `coin_transactions` insert in the same
  transaction that updates `users.coins`, with `CHECK (coins >= 0)`.
- Scores/coins from a minigame are computed server-side from a valid, unused, time-bound nonce; the
  client's claimed score is ignored.
- Purchases run in one transaction: verify balance, insert ownership (PK prevents duplicates), insert
  the negative coin transaction, decrement coins.
- Chat is written to `chat_messages` only after a final decision of `allow`; `moderation_log` is
  always written.

## Indexes

`users(username)` (unique), `users(last_seen_at)`, `chat_messages(room, created_at desc)`,
`game_sessions(user_id, status)`, `reports(status)`.

## Migrations

Alembic from the start; the schema will evolve and migrations keep it reproducible.
