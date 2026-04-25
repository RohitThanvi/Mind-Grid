# MindGrid v2.0 — Upgrade Guide

## What Changed

### Backend
| File | Change |
|------|--------|
| `app/models.py` | Rewritten — new columns for ELO tracking, interests, debate status, badges |
| `app/elo.py` | **NEW** — Chess.com K-factor ELO engine |
| `app/badges_engine.py` | **NEW** — GitHub-style achievement system (14 badges) |
| `app/matchmaking.py` | Rewritten — ELO+interest matching, forfeit on disconnect, draw proposals |
| `app/evaluation.py` | Rewritten — proper player1 vs player2 AI evaluation |
| `app/schemas.py` | Updated — new fields in UserOut, DebateOut |
| `app/debate.py` | Cleaned up |
| `app/main.py` | Cleaned up — registers new routers, seeds DB on startup |
| `app/migrate_v2.py` | **NEW** — Run once to add columns to existing Postgres DB |
| `app/routers/interests_routes.py` | **NEW** — Interest CRUD + 10 seeded categories with topic pools |
| `app/routers/profile_routes.py` | **NEW** — GitHub-style public profiles with ELO graph & badges |

### Frontend
| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Added `interests_setup`, `refreshUser`, new user fields |
| `src/App.tsx` | Added `/interests` and `/profile/:username` routes, interests guard |
| `src/pages/Interests.tsx` | **NEW** — Interest selection after registration |
| `src/pages/Matchmaking.tsx` | Rewritten — ELO range display, interest-based search, proper socket lifecycle |
| `src/pages/Debate.tsx` | Rewritten — draw proposals, forfeit button, opponent-left detection, timer |
| `src/pages/Result.tsx` | Rewritten — ELO change cards, per-player AI feedback, key moments |
| `src/pages/Dashboard.tsx` | Rewritten — clean navbar, W/L/D bar, profile link, no Adnan credit |
| `src/pages/Profile.tsx` | **NEW** — Public profile with ELO graph, badge grid, W/L stats |

---

## Deployment Steps

### 1. Run DB migration (existing deployments only)
```bash
cd backend
python -m app.migrate_v2
```
Fresh deployments auto-create all tables via `Base.metadata.create_all`.

### 2. Environment variables (no changes needed)
```
GROQ_API_KEY=...
JWT_SECRET=...
DATABASE_URL=postgresql://...
FRONTEND_URL=https://your-frontend.com
```

### 3. Backend deploy (Render / Railway)
```
# No changes to Procfile or runtime.txt needed
```

### 4. Frontend deploy
```bash
cd frontend
npm install
npm run build
```
Set `VITE_API_URL` to your backend URL.

---

## New Features Summary

### Chess.com-style Matchmaking
- ELO range: ±300 (expands to ±600 as fallback)
- Interest-weighted: players with shared interests are prioritised
- Match quality score = `interests_overlap × 2 + elo_proximity`
- Debate topic auto-selected from shared interest pool

### Interest-Based Pairing
- 10 interest categories: History, Science, Politics, Philosophy, Economics, Environment, Culture, Sports, Education, Ethics
- Each has 5 curated debate topics
- Shown after registration — blocks access to rest of app until completed
- Stored in `user_interests` junction table

### Forfeit on Disconnect
- Player disconnecting from active debate → `forfeit_p2/p1` result
- Winner gets full ELO gain; loser gets capped loss
- `opponent_left` event emitted to remaining player

### Mutual Draw
- Either player can propose draw mid-debate
- Banner shown to opponent with Accept / Decline
- If accepted → `draw` result, both get `Peacemaker` badge

### ELO System (chess.com K-factor)
- Starting ELO: 1200
- K-factor: 40 (< 30 games), 20 (30–100), 10 (2400+), 20 (standard)
- Floor: 100 ELO minimum
- Forfeit win = same as win, forfeit loss = same as loss

### GitHub-style Profiles
- Public URL: `/profile/:username`
- ELO rating graph (SVG, last 30 games)
- Badge grid with tier/rarity colours
- W/L/D bar, win rate, streak stats

### 14 Achievement Badges
Onboarding, win milestones (1/10/50/100), streaks (3/5/10), ELO milestones (1400/1600/2000), versatile debater, comeback kid, peacemaker
