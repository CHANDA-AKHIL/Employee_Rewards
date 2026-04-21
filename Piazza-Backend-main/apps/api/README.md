# 🔧 Piazza Rewards — Backend API

**Live URL:** https://employee-rewards.onrender.com

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js 20 + TypeScript | Runtime & type safety |
| Express.js | REST API framework |
| Prisma ORM | Type-safe database queries |
| PostgreSQL (Neon) | Production database |
| Redis (Upstash) | Session caching + JWT blacklisting |
| Socket.io | Real-time leaderboard & notifications |
| Supabase Storage | Badge & reward image uploads |
| JWT + bcryptjs | Authentication & password hashing |
| Winston | Structured logging |


---

## Scoring Engine Flow

When admin approves a KPI, this chain runs automatically:
KPI Approved
→ Write to points ledger
→ Update employee total points
→ Update streak count
→ Check & unlock badges
→ Recalculate leaderboard rankings
→ Emit Socket.io events to all clients
### Badge Unlock Conditions
```json
{ "type": "points", "threshold": 100 }
{ "type": "kpis_completed", "threshold": 5 }
{ "type": "streak", "threshold": 7 }
```

---

## Real-Time Socket Events

| Event                | Trigger               | Target               |
|----------------------|-----------------------|----------------------|
| `leaderboard:update` | KPI approved          | Everyone             |
| `notification:new`   | KPI approved/rejected | Specific employee    |
| `badge:unlocked`     | Badge earned          | Specific employee    |

---

## Environment Variables

| Variable       | Description 
|----------------|-----------------------------------
| `DATABASE_URL` | Neon PostgreSQL connection string 
| `REDIS_URL`    | Upstash Redis TCP URL
| `JWT_SECRET`   | 64-byte hex secret 
| `SUPABASE_URL` | Supabase project URL 
| `SUPABASE_KEY` | Supabase anon key 
| `CORS_ORIGIN`  | Frontend Vercel URL 
| `NODE_ENV`     | `production` 
| `PORT`         | `4000` 

---

## Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # prisma generate + TypeScript compile
npm start        # Run compiled production build
npm test         # Run Jest test suites
```

---

## Response Format

### Success
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Error
```json
{
  "success": false,
  "error": "Description of error",
  "code": 400
}
```

### Paginated
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```