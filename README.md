# 🏆 Piazza Rewards — Employee Gamification Platform

A production-grade, full-stack **Employee Reward & Recognition Platform** that gamifies workplace performance through KPIs, badges, leaderboards, and a reward catalog.

**Live Application:** https://employee-rewards.vercel.app  
**Backend API:** https://employee-rewards.onrender.com

---

## 🌟 What Is This?

Piazza Rewards transforms workplace performance into an engaging experience:

- Admins create and assign **KPIs** to employees
- Employees complete KPIs and submit them for review
- Admins approve submissions → system **automatically awards points**
- Points unlock **badges**, maintain **streaks**, and drive **leaderboard rankings**
- Employees **redeem points** for rewards from a catalog
- Everything updates **in real-time** via WebSockets

---

## 🚀 Tech Stack

### Frontend
| Technology           | Purpose 
|----------------------|--------------
| React 18 + TypeScript| UI framework 
|Vite 8                | Build tool 
| Tailwind CSS         | Styling 
| Zustand              | State management 
| Socket.io-client     | Real-time updates 
| React Router v7      | Client-side routing 
| Recharts             | Analytics charts 

### Backend
| Technology           | Purpose 
|----------------------|--------------
| Node.js + Express    | HTTP server 
| TypeScript           | Type safety 
| Prisma ORM           | Database queries 
| PostgreSQL (Neon)    | Main database 
| Redis (Upstash)      | Session & JWT management 
| Socket.io            | Real-time events 
| Supabase Storage     | File/image uploads 
| JWT + bcryptjs       | Authentication 

---

## File structure

```
apps/
├── api/src/
│   ├── controllers/     # authController, kpiController, rewardController,
│   │                    # employeeController, gamificationController,
│   │                    # analyticsController, auditController,
│   │                    # notificationController, redemptionController
│   ├── routes/          # auth, kpis, rewards, employees, gamification,
│   │                    # analytics, audit, notifications, redemptions
│   ├── services/        # gamificationService, scoringEngine,
│   │                    # notificationService, s3Service
│   ├── middleware/       # verifyJWT, roleGuard
│   ├── prisma/          # schema.prisma, client.ts
│   └── utils/           # response.ts, redis.ts, logger.ts
│
└── web/src/
    ├── pages/
    │   ├── admin/       # Dashboard, Kpis, Employees, Approvals, Rewards,
    │   │                # Badges, Challenges, Analytics, Leaderboard, Audit
    │   ├── employee/    # Dashboard, Kpis, Badges, Leaderboard, Challenges,
    │   │                # Rewards, Achievements, Profile, Analytics, Settings
    │   └── auth/        # Login, Register
    ├── layouts/         # AppLayout, AuthLayout
    ├── components/ui/   # Button, Card, Input, Modal, Badge, Avatar, Navbar, Sidebar
    ├── router/          # index.tsx (AppRouter + ProtectedRoute)
    ├── store/           # authStore.ts
    ├── services/        # api.ts
    └── socket/          # socket.ts
```

---

---

## 🔐 Admin Hierarchy

| Role               | Access 
| **Admin**          | Manage employees, KPIs, rewards, approvals 
| **Employee**       | View own KPIs, submit completions, redeem rewards 

Registering with an `@admin.com` email places the account in `PENDING` state until approved by Super Admin.

---

## 🎮 Gamification Features

- **Live Leaderboard** — Rankings update instantly when KPIs are approved
- **Badge System** — Unlock badges based on points, streaks, and KPI completions
- **Streak Tracking** — Consecutive daily KPI completions build streaks
- **Challenges** — Monthly goals employees can accept and track
- **Points Ledger** — Full history of every point earned and spent
- **Reward Catalog** — Redeem points for real rewards

---

## ☁️ Production Infrastructure

| Service          | Provider | Purpose 
|------------------|----------|---------   
| Frontend hosting | Vercel   | React app 
| Backend hosting  | Render   | Node.js API 
| Database         | Neon     | PostgreSQL 
| Cache            | Upstash  | Redis 
| File storage     | Supabase | Images 

---

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- Docker Desktop

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/CHANDA-AKHIL/Employee_Rewards.git
cd Employee_Rewards/Piazza-Backend-main

# 2. Start local infrastructure
docker-compose up -d
# Starts: PostgreSQL on :5432, Redis on :6379, MinIO on :9000

# 3. Setup backend
cd apps/api
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
# API runs on http://localhost:4000

# 4. Setup frontend (new terminal)
cd apps/web
npm install
npm run dev
# UI runs on http://localhost:5173
```

---

## 👤 Sample Credentials

| Role     | Email                        | Password   |
|----------|------------------------------|------------|
| Admin    | manager@admin.com            | 111111     |
| Employee | mrakhil9642@gmail.com        | 111111     |
