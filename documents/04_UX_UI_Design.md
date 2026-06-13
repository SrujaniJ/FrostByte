# UX / UI Design — Frostbyte

v1 keeps visuals deliberately minimal so engineering effort concentrates on the backend and
security. The design goals are an original visual identity and clear surfacing of the security-
relevant interactions (moderation notices, server-validated results, reporting).

## 1. Principles

- **Simple to build, intentional in look.** DOM + CSS, a small palette, flat shapes; no game engine
  in v1.
- **Original identity.** A distinct name, mascot, and palette; the genre's layout idea (a town you
  walk around) is borrowed, not any artwork.
- **Security made visible.** The moderation notice, the "server-validated" result badge, and the
  report control are part of the UX, not just backend behaviour.
- **Honest loading states.** Free-tier cold starts are surfaced rather than hidden.

## 2. Visual language (template — to be finalized)

- **Palette:** one brand hue + neutrals, defined as CSS variables.
- **Type:** one display font for headings, one readable sans for body (free, licensed webfonts).
- **Shapes:** rounded rectangles, soft shadows, flat fills. Avatars are a simple geometric character
  customizable by color and a couple of accessories.
- **Tone:** friendly, all-ages, calm.

## 3. Screens (v1)

| Screen | Purpose | Key elements |
|--------|---------|--------------|
| Landing | Entry | Title, one-line pitch, "Play", link to repo |
| Auth | Register / login | Username, password, error + rate-limit states |
| Avatar Setup | First-run identity | Base character, color, starter items, Save |
| Town | The world | Backdrop, player avatar, ghost/NPC avatars, chat panel, nav, coin balance |
| Minigame | Earn coins | Game area, score, "validated by server" result badge |
| Shop | Spend coins | Item grid, prices, owned state, buy controls |
| Report dialog | Trust & Safety | Message context, reason, submit |
| Admin: Reports | Review | Report table + actions (admin-only route) |

## 4. Layout sketches

**Town**
```
+------------------------------------------------------+
|  Frostbyte            coins: 120        [Shop][Game] |
+------------------------------------------------------+
|        (ghost)        you            NPC             |
|           o            o              o              |
|          /|\          /|\            /|\             |
|     ~~~~~~~~~~~~~~~~ town backdrop ~~~~~~~~~~~~~~~~~~  |
+------------------------------------------------------+
| Chat                                                 |
|  fluffy123: hi!                                      |
|  you: hello                          [report on hover]|
|  > type a message...                          [send] |
+------------------------------------------------------+
```

**Minigame result (security made visible)**
```
+----------------------------+
|   Round over!              |
|   Score: 740               |
|   + 74 coins               |
|   [✓ validated by server]  |
+----------------------------+
```

**Chat blocked notice**
```
That message wasn't sent — it looked like it broke the chat rules.
Try rephrasing.  (the blocked text is not shown publicly)
```

## 5. Movement (v1)

Click-to-move: clicking a point CSS-transitions the avatar over ~400ms; the position posts to the
server for bounds-checking. Other avatars update on a slow poll. No keyboard physics in v1.

## 6. Accessibility

- Sufficient contrast; meaning not encoded by color alone.
- Keyboard-focusable controls with a visible focus ring.
- Labeled chat input; errors announced, not only colored.
- Respect `prefers-reduced-motion` (skip the move animation).

## 7. Out of scope for v1

Pixel art / sprite animation beyond a CSS move; multiple rooms, day/night, weather, music;
responsive mobile layout (desktop-first); a full design system.

## 8. Implementation note

Plain React components with a small stylesheet; no heavy UI kit. Security-relevant code
(authentication, sessions, chat handling) is written and reviewed deliberately, and no secrets or
trust decisions live in the frontend.
