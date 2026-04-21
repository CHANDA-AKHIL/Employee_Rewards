# 🎨 Piazza Rewards — Frontend

**Live URL:** https://employee-rewards.vercel.app

---

## Tech Stack

| Technology             | Purpose 
|------------------------|---------------------------
| React 18 + TypeScript  | UI framework
| Vite 8                 | Build tool & dev server  
| Tailwind CSS 4         | Utility-first styling 
| Zustand                | Global state management 
| React Router v7        | Client-side routing 
| Socket.io-client       | Real-time leaderboard updates 
| Axios                  | HTTP client 
| Recharts               | Analytics visualizations 
| Lucide React           | Icon library 
| React Hook Form        | Form handling 

---


## Key Features

- **Dual Dashboard** — Separate views for Admin and Employee roles
- **Real-time Leaderboard** — Updates instantly via Socket.io
- **Badge System** — Visual unlock celebrations
- **KPI Management** — Full workflow with submit and approval
- **Reward Catalog** — Browse and redeem with points
- **Analytics Charts** — Department and trend visualizations
- **Admin Approval Inbox** — Review pending admin registrations
- **Responsive Design** — Works on mobile and desktop

---

## Environment Variables

| Variable       | Description                 
|----------------|----------------------------  
| `VITE_API_URL` | Backend API URL e.g. `https://employee-rewards.onrender.com/api` |

---

## Scripts

```bash
npm run dev      # Start dev server at localhost:5173
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build locally
npm test         # Run Vitest test suite
npm run lint     # ESLint check
```

---

## Deployment

Deployed on **Vercel** with automatic deploys on every push to `main` branch.

`vercel.json` enables React Router client-side routing:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Local Development

```bash
cd apps/web
npm install
npm run dev
# Opens at http://localhost:5173
```

Make sure the backend is running at `http://localhost:4000` and set: