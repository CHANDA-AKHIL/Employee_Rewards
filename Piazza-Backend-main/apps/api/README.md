# 🏆 Employee Reward System — Backend API

A complete backend system that lets companies **track employee KPIs**, **reward top performers**, and **gamify the workplace** with points, badges, leaderboards, and a reward catalog.

---

## 📌 Table of Contents

1. [What Does This System Do?](#what-does-this-system-do)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [How Authentication Works](#how-authentication-works)
6. [All API Endpoints](#all-api-endpoints)
7. [How the Scoring Engine Works](#how-the-scoring-engine-works)
8. [Real-Time Events (Socket.io)](#real-time-events-socketio)
9. [File Storage (MinIO/S3)](#file-storage-minios3)
10. [Email Notifications](#email-notifications)
11. [Logging & Audit Trail](#logging--audit-trail)
12. [How to Run](#how-to-run)
13. [How to Test](#how-to-test)
14. [Response Format](#response-format)

---

## What Does This System Do?

Think of it as a **workplace gamification platform**:

1. **Admin creates KPIs** (Key Performance Indicators) and assigns them to employees
2. **Employee completes a KPI** and submits it for review
3. **Admin approves it** → the system **automatically awards points**
4. Points accumulate → employee **climbs the leaderboard**, **unlocks badges**, and **maintains streaks**
5. Employee can **spend points** on rewards from a catalog (gift cards, swag, etc.)
6. Admin can **track everything** via analytics dashboards

Everything happens in real-time via WebSockets, with email notifications for important events.

---

## Tech Stack

| Technology | What It Does |
|---|---|
| **Node.js 20** | JavaScript runtime |
| **TypeScript** | Type-safe JavaScript |
| **Express.js** | HTTP server / REST API framework |
| **Prisma ORM** | Database queries made easy (type-safe) |
| **PostgreSQL** | Main database (stores all data) |
| **Redis** | Session caching + JWT blacklisting |
| **Socket.io** | Real-time events (leaderboard updates, notifications) |
| **MinIO** | S3-compatible file storage (badge/reward images) |
| **Nodemailer** | Sending emails (SMTP) |
| **Winston** | Logging (console + file) |
| **Jest** | Testing framework |
| **Docker Compose** | Runs Postgres, Redis, MinIO locally |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Multer** | File upload handling |

---

## Project Structure

```
piazza/
├── docker-compose.yml          ← Starts Postgres, Redis, MinIO
│
└── apps/api/
    ├── package.json            ← Dependencies & scripts
    ├── tsconfig.json           ← TypeScript config
    ├── jest.config.js          ← Test config
    ├── .env.example            ← Environment variables template
    ├── .gitignore
    │
    └── src/
        ├── server.ts           ← 🚀 MAIN ENTRY POINT (starts everything)
        │
        ├── prisma/
        │   ├── schema.prisma   ← Database tables definition
        │   └── client.ts       ← Prisma database connection
        │
        ├── middleware/         ← Runs BEFORE your route handlers
        │   ├── verifyJWT.ts    ← Checks if user is logged in
        │   ├── roleGuard.ts    ← Checks if user is ADMIN
        │   ├── auditLog.ts     ← Logs admin actions to database
        │   ├── requestLogger.ts← Logs every HTTP request
        │   └── errorHandler.ts ← Catches unhandled errors
        │
        ├── controllers/        ← Business logic for each route
        │   ├── authController.ts
        │   ├── employeeController.ts
        │   ├── kpiController.ts
        │   ├── rewardController.ts
        │   ├── redemptionController.ts
        │   ├── gamificationController.ts
        │   ├── analyticsController.ts
        │   └── notificationController.ts
        │
        ├── routes/             ← URL → Controller mapping
        │   ├── auth.ts
        │   ├── employees.ts
        │   ├── kpis.ts
        │   ├── rewards.ts
        │   ├── redemptions.ts
        │   ├── gamification.ts
        │   ├── analytics.ts
        │   └── notifications.ts
        │
        ├── services/           ← Core business logic
        │   ├── scoringEngine.ts       ← Points, streaks, badges, leaderboard
        │   ├── notificationService.ts ← Create & send notifications
        │   ├── emailService.ts        ← Send emails via SMTP
        │   ├── s3Service.ts           ← Upload/download files from MinIO
        │   └── gamificationService.ts ← Badges, leaderboard, challenges
        │
        ├── socket/
        │   └── handler.ts     ← Socket.io connection & auth
        │
        ├── utils/
        │   ├── response.ts    ← Standard JSON response helpers
        │   ├── logger.ts      ← Winston logger setup
        │   └── redis.ts       ← Redis connection
        │
        └── __tests__/         ← Unit tests
            ├── auth.test.ts
            ├── scoringEngine.test.ts
            └── approvalWorkflow.test.ts
```

### How the folders connect:

```
Request → Route → Middleware → Controller → Service → Database
                                              ↓
                                        Socket.io / Email
```

---

## Database Schema

We use **Prisma ORM** with **PostgreSQL**. Here are all the tables:

### 👤 `employees` — Users of the system

| Column | Type | Description |
|---|---|---|
| id | UUID | Unique identifier |
| name | String | Full name |
| email | String | Unique email |
| password_hash | String | Hashed password (bcrypt) |
| role | ADMIN / EMPLOYEE | What they can do |
| department | String | e.g. "Engineering", "Sales" |
| level | Int | Employee level (starts at 1) |
| total_points | Int | Lifetime points earned |
| streak_count | Int | Consecutive days of KPI completions |
| is_deleted | Boolean | Soft delete flag |
| created_at | DateTime | When account was created |

### 📊 `kpis` — Tasks assigned to employees

| Column | Type | Description |
|---|---|---|
| id | UUID | Unique identifier |
| title | String | KPI name |
| description | String | What needs to be done |
| point_value | Int | How many points this is worth |
| assigned_to | UUID | → employees.id |
| status | PENDING / COMPLETE / APPROVED / REJECTED | Current state |
| reject_reason | String | Why it was rejected (if applicable) |
| submitted_at | DateTime | When employee submitted it |
| approved_at | DateTime | When admin approved it |

### 🎁 `rewards` — Items employees can redeem

| Column | Type | Description |
|---|---|---|
| id | UUID | Unique identifier |
| name | String | e.g. "Amazon Gift Card" |
| description | String | Details |
| point_cost | Int | How many points to redeem |
| category | String | e.g. "Gift Cards", "Swag" |
| stock | Int | How many are available |
| image_url | String | Path in MinIO storage |

### 🛒 `redemptions` — Redemption requests

| Column | Type | Description |
|---|---|---|
| id | UUID | Unique identifier |
| employee_id | UUID | Who is redeeming |
| reward_id | UUID | What they're redeeming |
| status | PENDING / APPROVED / REJECTED | Current state |
| requested_at | DateTime | When requested |
| resolved_at | DateTime | When admin decided |

### 💰 `points_ledger` — Every point transaction

| Column | Type | Description |
|---|---|---|
| id | UUID | Unique identifier |
| employee_id | UUID | Who earned/spent |
| points | Int | Amount (+earning, -spending) |
| reason | String | e.g. "KPI Approved: Complete Task" |
| created_at | DateTime | When it happened |

### 🏅 `badges` — Achievable badges

| Column | Type | Description |
|---|---|---|
| id | UUID | Unique identifier |
| name | String | e.g. "First KPI", "Point Master" |
| description | String | What this badge means |
| image_url | String | Badge image in MinIO |
| unlock_condition | JSON String | e.g. `{"type":"points","threshold":100}` |

### 🏅 `employee_badges` — Which badges each employee has

| Column | Type | Description |
|---|---|---|
| employee_id | UUID | The employee |
| badge_id | UUID | The badge |
| unlocked_at | DateTime | When they earned it |

### 🏆 `leaderboard` — Monthly rankings

| Column | Type | Description |
|---|---|---|
| employee_id | UUID | One entry per employee |
| rank | Int | Current position |
| monthly_points | Int | Points earned this month |

### 🔔 `notifications` — In-app notifications

| Column | Type | Description |
|---|---|---|
| employee_id | UUID | Who receives it |
| message | String | The notification text |
| type | String | KPI_APPROVED, BADGE_UNLOCKED, etc. |
| is_read | Boolean | Has the user seen it? |

### 📝 `audit_logs` — Admin action history

| Column | Type | Description |
|---|---|---|
| admin_id | UUID | Which admin did this |
| action | String | CREATE, UPDATE, DELETE |
| target_table | String | Which table was affected |
| target_id | UUID | Which record |
| metadata | JSON String | Request details |

### 🎯 `challenges` — Monthly challenges

| Column | Type | Description |
|---|---|---|
| title | String | Challenge name |
| target_points | Int | Points needed to complete |
| start_date / end_date | DateTime | Active period |
| is_active | Boolean | Currently running? |

---

## How Authentication Works

We use **JWT (JSON Web Tokens) + Redis** for session management.

### The Flow:

```
1. User sends email + password to POST /auth/login
2. Server verifies password with bcrypt
3. Server creates a JWT token with { id, email, role }
4. Server stores session in Redis with TTL (7 days)
5. Server returns the JWT token to client
6. Client sends token in header: Authorization: Bearer <token>
7. Every protected route calls verifyJWT middleware which:
   a. Extracts token from header
   b. Checks if token is blacklisted in Redis (logged out?)
   c. Checks if session exists in Redis
   d. Decodes the JWT and attaches user to request
```

### Logout:
```
1. Token is added to Redis blacklist
2. Session is deleted from Redis
3. Even if someone has the token, it won't work anymore
```

### Role Guard:
```
Some routes are ADMIN-only (creating KPIs, managing employees, etc.)
The roleGuard middleware checks req.user.role before allowing access
```

---

## All API Endpoints

### 🔐 Auth (`/auth`)

| Method | Endpoint | Auth? | Role | What It Does |
|---|---|---|---|---|
| POST | `/auth/register` | ❌ | Any | Create new account |
| POST | `/auth/login` | ❌ | Any | Login, get JWT token |
| POST | `/auth/logout` | ✅ | Any | Invalidate token |
| GET | `/auth/me` | ✅ | Any | Get your own profile |

### 👥 Employees (`/employees`)

| Method | Endpoint | Auth? | Role | What It Does |
|---|---|---|---|---|
| GET | `/employees` | ✅ | ADMIN | List all employees (paginated) |
| POST | `/employees` | ✅ | ADMIN | Create new employee |
| GET | `/employees/:id` | ✅ | Any | Get employee profile |
| PUT | `/employees/:id` | ✅ | ADMIN | Update employee |
| DELETE | `/employees/:id` | ✅ | ADMIN | Soft delete employee |
| GET | `/employees/:id/stats` | ✅ | Any | Get points, badges, level, streak, rank |

### 📊 KPIs (`/kpis`)

| Method | Endpoint | Auth? | Role | What It Does |
|---|---|---|---|---|
| GET | `/kpis` | ✅ | Any | List KPIs (admin sees all, employee sees own) |
| POST | `/kpis` | ✅ | ADMIN | Create & assign KPI to employee |
| GET | `/kpis/:id` | ✅ | Any | Get single KPI |
| PUT | `/kpis/:id` | ✅ | ADMIN | Update KPI |
| DELETE | `/kpis/:id` | ✅ | ADMIN | Delete KPI |
| POST | `/kpis/:id/submit` | ✅ | EMPLOYEE | Submit KPI as complete |
| POST | `/kpis/:id/approve` | ✅ | ADMIN | Approve → **triggers scoring engine** |
| POST | `/kpis/:id/reject` | ✅ | ADMIN | Reject with reason |

### 🎁 Rewards (`/rewards`)

| Method | Endpoint | Auth? | Role | What It Does |
|---|---|---|---|---|
| GET | `/rewards` | ✅ | Any | List rewards (filter by `?category=`) |
| POST | `/rewards` | ✅ | ADMIN | Create reward (with image upload) |
| GET | `/rewards/:id` | ✅ | Any | Get reward detail |
| PUT | `/rewards/:id` | ✅ | ADMIN | Update reward |
| DELETE | `/rewards/:id` | ✅ | ADMIN | Delete reward |

### 🛒 Redemptions (`/redemptions`)

| Method | Endpoint | Auth? | Role | What It Does |
|---|---|---|---|---|
| GET | `/redemptions` | ✅ | Any | List redemptions (admin=all, employee=own) |
| POST | `/redemptions` | ✅ | EMPLOYEE | Request redemption (deducts points) |
| GET | `/redemptions/:id` | ✅ | Any | Get redemption detail |
| POST | `/redemptions/:id/approve` | ✅ | ADMIN | Approve → sends email |
| POST | `/redemptions/:id/reject` | ✅ | ADMIN | Reject → refunds points |

### 🏆 Gamification (`/gamification`)

| Method | Endpoint | Auth? | Role | What It Does |
|---|---|---|---|---|
| GET | `/gamification/badges` | ✅ | Any | List all available badges |
| GET | `/gamification/badges/mine` | ✅ | EMPLOYEE | My unlocked badges |
| POST | `/gamification/badges` | ✅ | ADMIN | Create badge (with image upload) |
| GET | `/gamification/leaderboard` | ✅ | Any | Top employees by monthly points |
| GET | `/gamification/leaderboard/me` | ✅ | Any | My current rank |
| GET | `/gamification/challenges` | ✅ | Any | Active challenges |
| POST | `/gamification/challenges` | ✅ | ADMIN | Create challenge |
| GET | `/gamification/challenges/:id/progress` | ✅ | Any | My progress on a challenge |

### 📈 Analytics (`/analytics`) — Admin Only

| Method | Endpoint | What It Does |
|---|---|---|
| GET | `/analytics/kpi-trends` | Points earned per week/month |
| GET | `/analytics/top-performers` | Top 10 employees by total points |
| GET | `/analytics/redemption-stats` | Which rewards are most popular |
| GET | `/analytics/department-stats` | Points breakdown by department |

### 🔔 Notifications (`/notifications`)

| Method | Endpoint | What It Does |
|---|---|---|
| GET | `/notifications` | My notifications (paginated) |
| PUT | `/notifications/:id/read` | Mark one as read |
| PUT | `/notifications/read-all` | Mark all as read |
| GET | `/notifications/unread-count` | Badge count for nav icon |

---

## How the Scoring Engine Works

This is the **core brain** of the system. When an admin approves a KPI, this entire chain runs automatically:

```
Admin clicks "Approve KPI"
        │
        ▼
┌─────────────────────────────┐
│  1. WRITE TO POINTS LEDGER  │  → Records: "KPI Approved: Task X = +50 pts"
└──────────────┬──────────────┘
               │
        ▼
┌─────────────────────────────┐
│  2. UPDATE EMPLOYEE POINTS  │  → employee.total_points += 50
└──────────────┬──────────────┘
               │
        ▼
┌─────────────────────────────┐
│  3. CHECK & UPDATE STREAK   │  → Did they complete one yesterday too?
│                             │     YES → streak_count + 1
│                             │     NO  → streak_count = 1
└──────────────┬──────────────┘
               │
        ▼
┌─────────────────────────────┐
│  4. EVALUATE BADGE UNLOCKS  │  → Check ALL badge conditions:
│                             │     - "100 points?" → unlock 🏅
│                             │     - "5 KPIs done?" → unlock 🏅
│                             │     - "7-day streak?" → unlock 🏅
│                             │  → Send notification + Socket event
└──────────────┬──────────────┘
               │
        ▼
┌─────────────────────────────┐
│  5. RECALCULATE LEADERBOARD │  → Sum this month's points for everyone
│                             │  → Sort & assign ranks
└──────────────┬──────────────┘
               │
        ▼
┌─────────────────────────────┐
│  6. EMIT SOCKET.IO EVENT    │  → "leaderboard:update" to all clients
└─────────────────────────────┘
```

### Badge Unlock Conditions

Badges use a JSON condition stored in the database:

```json
{ "type": "points", "threshold": 100 }        // Earned 100+ total points
{ "type": "kpis_completed", "threshold": 5 }   // Completed 5+ KPIs
{ "type": "streak", "threshold": 7 }           // 7-day streak
```

---

## Real-Time Events (Socket.io)

Clients connect to the WebSocket server using their JWT token:

```javascript
// Client-side example
const socket = io('http://localhost:4000', {
  auth: { token: 'your-jwt-token' }
});

socket.on('leaderboard:update', (data) => {
  // Refresh leaderboard UI
});

socket.on('notification:new', (data) => {
  // Show notification popup
});

socket.on('badge:unlocked', (data) => {
  // Show badge animation
});
```

### Events:

| Event | Target | When |
|---|---|---|
| `leaderboard:update` | Everyone | After any KPI approval |
| `notification:new` | Specific employee | KPI approved/rejected, badge unlocked, redemption resolved |
| `badge:unlocked` | Specific employee | When they earn a new badge |

---

## File Storage (MinIO/S3)

MinIO is an S3-compatible storage running locally via Docker.

- **Badge images** → stored in `badges/` folder
- **Reward images** → stored in `rewards/` folder
- Uploaded via `multer` (in-memory buffer) → pushed to MinIO
- Retrieved via **signed URLs** (temporary access links, expire in 1 hour)

---

## Email Notifications

Using **Nodemailer** with SMTP. Three types of emails:

| Email | When | Content |
|---|---|---|
| **Reward Approved** | Admin approves redemption | "Congratulations! Your [reward] has been approved" |
| **Badge Unlocked** | Employee earns a badge | "You've earned the [badge name] badge!" |
| **Weekly Digest** | Scheduled (cron) | Points earned, KPIs completed, current rank |

---

## Logging & Audit Trail

### Request Logging (Winston)
Every single HTTP request is logged with:
- Method (GET, POST, etc.)
- Path (/auth/login, /kpis, etc.)
- Status code (200, 401, 500, etc.)
- Latency (how long it took)
- Saved to `logs/combined.log` and `logs/error.log`

### Audit Logging (Database)
Every admin action is recorded in the `audit_logs` table:
- Which admin did it
- What action (CREATE, UPDATE, DELETE)
- Which table and record was affected
- Full request metadata

---

## How to Run

### Prerequisites
- **Node.js 20+** installed
- **Docker Desktop** installed and running

### Step 1: Start Infrastructure
```bash
# From the project root (piazza/)
docker-compose up -d
```
This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- MinIO on `localhost:9000` (console on `localhost:9001`)

### Step 2: Install Dependencies
```bash
cd apps/api
npm install
```

### Step 3: Setup Environment
```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### Step 4: Run Database Migrations
```bash
npx prisma migrate dev --name init
```
This creates all the tables in PostgreSQL.

### Step 5: Start the Server
```bash
npm run dev
```
Server runs on `http://localhost:4000`

### Step 6: Verify
```bash
curl http://localhost:4000/health
# → { "status": "ok", "timestamp": "..." }
```

---

## How to Test

```bash
npm test
```

Runs 3 test suites:
- **auth.test.ts** — Password hashing, JWT signing/verification, registration
- **scoringEngine.test.ts** — Points, streaks, badge conditions, leaderboard ranking
- **approvalWorkflow.test.ts** — KPI workflow, redemption edge cases, streak resets

---

## Response Format

Every endpoint returns a consistent JSON format:

### ✅ Success
```json
{
  "success": true,
  "data": { "id": "...", "name": "..." },
  "message": "Employee created"
}
```

### ❌ Error
```json
{
  "success": false,
  "error": "Email already registered",
  "code": 409
}
```

### 📄 Paginated
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  },
  "message": "Success"
}
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | 4000 | Server port |
| `DATABASE_URL` | postgresql://postgres:postgres@localhost:5432/reward_system | Postgres connection |
| `REDIS_URL` | redis://localhost:6379 | Redis connection |
| `JWT_SECRET` | (change this!) | Secret for signing tokens |
| `JWT_EXPIRES_IN` | 7d | Token expiry |
| `MINIO_ENDPOINT` | localhost | MinIO host |
| `MINIO_PORT` | 9000 | MinIO port |
| `MINIO_ACCESS_KEY` | minioadmin | MinIO access key |
| `MINIO_SECRET_KEY` | minioadmin | MinIO secret key |
| `SMTP_HOST` | smtp.gmail.com | Email server |
| `SMTP_USER` | — | Email address |
| `SMTP_PASS` | — | Email app password |
| `CORS_ORIGIN` | http://localhost:3000 | Frontend URL |

---

## Quick API Test Flow

Here's a complete flow to test the system end-to-end:

```bash
# 1. Register an admin
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"admin123","role":"ADMIN"}'

# 2. Register an employee
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"john123"}'

# 3. Login as admin (save the token)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
# → { token: "eyJhb..." }

# 4. Create a KPI (use admin token)
curl -X POST http://localhost:4000/kpis \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Complete React Module","pointValue":50,"assignedTo":"<employee-id>"}'

# 5. Login as employee, submit the KPI
curl -X POST http://localhost:4000/kpis/<kpi-id>/submit \
  -H "Authorization: Bearer <employee-token>"

# 6. Admin approves → scoring engine runs automatically
curl -X POST http://localhost:4000/kpis/<kpi-id>/approve \
  -H "Authorization: Bearer <admin-token>"
# → Points awarded, badges checked, leaderboard updated!

# 7. Check employee stats
curl http://localhost:4000/employees/<employee-id>/stats \
  -H "Authorization: Bearer <employee-token>"
# → { totalPoints: 50, streakCount: 1, badgesEarned: 1, rank: 1 }
```

---

Built with ❤️ using Node.js, TypeScript, Express, Prisma, PostgreSQL, Redis, and Socket.io.
