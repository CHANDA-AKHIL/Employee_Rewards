# 🌟 Piazza Rewards Ecosystem

A high-fidelity, full-stack **Employee Reward and Gamification Platform**. This system features a dual-role dashboard (Staff & Admin), real-time leaderboard updates, badge unlock animations, and a hierarchical admin approval system.

---

## 🚀 Quick Start (One-Click Launch)

For Windows users, starting the entire ecosystem (Backend + Frontend + Browser) is as simple as clicking a button:

1.  **Open the project folder.**
2.  **Double-click `run_me.bat`.**
3.  The script will automatically:
    - Start the **Node.js API Server**.
    - Start the **Vite React Frontend**.
    - Open the application directly in **Google Chrome** at `http://localhost:5173`.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (Liquid Glass & Dark Mode Aesthetics)
- **Zustand** (State Management)
- **Lucide React** (Premium Icons)
- **Socket.io-client** (Real-time events)

### Backend
- **Node.js** + **Express** + **Prisma ORM**
- **PostgreSQL** (Relational Database)
- **Redis** (Session & JWT Management)
- **Socket.io** (Engagement Engine)
- **Docker Compose** (Containerized Infrastructure)

---

## 👔 Admin Approval Hierarchy

This project features a secure **Super Admin** system:
- **Admin 1 (Super Admin)**: Identified by `adminsample123@admin.com`. This is the "Boss" account.
- **Approval Workflow**: Any person registering with an `@admin.com` email is placed in a `PENDING` state. They cannot log in until the **Super Admin** approves them from the **Admin Request Inbox**.
- **Permanent Access**: Once approved, admins gain full access to create KPIs, manage staff, and assign challenges.

---

## 🎮 Gamification Features

- **Real-time Leaderboard**: See point rankings update instantly as KPIs are approved.
- **Interactive Badges**: Unlock visual badges with unique animations.
- **Vivid Motion Background**: A premium, motion-reactive background replaces static designs.
- **Acceptable Challenges**: Staff must explicitly "Accept" challenges before their progress is tracked, adding to the interactive game feel.

---

## 📦 How to Clone and Setup

If you are setting this up on a new machine, follow these steps:

### 1. Clone the Repository
```bash
git clone https://github.com/Nithish258/piazza_full.git
cd piazza_full
```

### 2. Environment Setup
Create a `.env` file in `apps/api/`:
```bash
# apps/api/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reward_system"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_secret_key"
```

### 3. Launch Services (Docker)
Ensure Docker is running, then start the database and caching layers:
```bash
docker-compose up -d
```

### 4. Run the App
- **Windows**: Just run `run_me.bat`.
- **Manual**:
  - `cd apps/api && npm install && npx prisma db push && npm run dev`
  - `cd apps/web && npm install && npm run dev`

---

## 👤 Sample Credentials

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `adminsample123@admin.com` | `admin123` |
| **Staff Member** | `sampletest123@gmail.com` | `sample123` |

---

Built with ❤️ by Nithish & Antigravity.
