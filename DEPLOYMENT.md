# ReachInbox – Production Deployment Guide (Render)

This comprehensive guide details the production deployment of the **ReachInbox Smart Email Scheduler** SaaS platform on [Render](https://render.com).

---

## 🏗️ Architecture Overview

The deployed system consists of 5 tightly coordinated services:

```
┌───────────────────────────────────────────────────────────────┐
│                 ReachInbox Frontend (Static Site)             │
│            React 18 • Vite • Tailwind CSS • SPA Routing       │
│               URL: https://reachinbox-frontend.onrender.com    │
└──────────────────────────────┬────────────────────────────────┘
                               │ HTTPS API Calls (Bearer JWT)
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                 ReachInbox Backend (Web Service)              │
│               Node.js 20 • Express REST API • Zod             │
│               URL: https://reachinbox-backend.onrender.com     │
└──────────────┬───────────────────────────────┬────────────────┘
               │                               │
        1. Save Metadata                2. Enqueue Delayed Job
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│    Render PostgreSQL 16      │ │    Render Redis Key-Value    │
│    Persistent Relational DB  │ │    Noeviction • AOF Queue    │
└──────────────────────────────┘ └─────────────┬────────────────┘
                                               │
                                        3. Delay Elapses
                                               │
                                               ▼
┌───────────────────────────────────────────────────────────────┐
│            ReachInbox Dedicated Worker (Background Worker)    │
│               BullMQ Job Processor • Idempotency Checks       │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                   Ethereal Email SMTP Service                 │
│         Renders live preview URLs for each sent email         │
└───────────────────────────────────────────────────────────────┘
```

---

## 🚀 Option 1: 1-Click Deployment with Render Blueprint (`render.yaml`)

The repository includes a production-grade `render.yaml` Blueprint that automatically provisions all 5 services with linked network environments and auto-generated secrets.

### Steps:
1. **Push Changes to GitHub**:
   Ensure this repository is pushed to your GitHub account (`origin/main`).
2. **Log into Render**:
   Open [dashboard.render.com](https://dashboard.render.com).
3. **Create New Blueprint**:
   - Click **"New +"** in the top navigation.
   - Select **"Blueprint"**.
   - Connect your GitHub repository (`reachinbox-email-scheduler`).
   - Click **"Connect"**.
4. **Approve Blueprint**:
   Render will parse `render.yaml` and display the 5 resources:
   - `reachinbox-db` (PostgreSQL)
   - `reachinbox-redis` (Redis Key Value)
   - `reachinbox-backend` (Node Web Service)
   - `reachinbox-worker` (Background Worker)
   - `reachinbox-frontend` (Static Site)
5. **Click "Apply"**:
   Render provisions the database and Redis first, generates migrations via `npx prisma migrate deploy`, builds the TypeScript application, starts the API and worker, and publishes the frontend.

---

## 🛠️ Option 2: Individual Service Deployment (Manual Step-by-Step)

If you prefer to deploy each service individually or are using the free tier:

### Step 1: Create PostgreSQL Database
1. Go to **Dashboard > New + > PostgreSQL**.
2. **Name**: `reachinbox-db`
3. **Database**: `reachinbox`
4. **User**: `reachinbox_user`
5. **Plan**: Free
6. Click **Create Database**.
7. Note down the **Internal Database URL**.

### Step 2: Create Redis Key-Value Store
1. Go to **Dashboard > New + > Redis** (or Key Value).
2. **Name**: `reachinbox-redis`
3. **Plan**: Free
4. **Maxmemory Policy**: `noeviction` (critical for BullMQ delayed queue persistence)
5. Click **Create Redis**.
6. Note down the **Internal Redis Connection String** (`redis://...`).

### Step 3: Deploy Backend Web Service
1. Go to **Dashboard > New + > Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `reachinbox-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Pre-Deploy Command**: `npx prisma migrate deploy`
   - **Start Command**: `node dist/server.js`
   - **Health Check Path**: `/health`
4. Add **Environment Variables**:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Render standard port |
   | `DATABASE_URL` | *(Paste Internal DB URL from Step 1)* | PostgreSQL connection |
   | `REDIS_URL` | *(Paste Internal Redis URL from Step 2)* | Redis BullMQ connection |
   | `JWT_SECRET` | *(Click "Generate" or random 32+ char string)* | Token encryption |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry |
   | `FRONTEND_URL` | `https://reachinbox-frontend.onrender.com` | CORS origin |
   | `SMTP_HOST` | `smtp.ethereal.email` | Test SMTP host |
   | `SMTP_PORT` | `587` | Test SMTP port |
   | `ETHEREAL_AUTO_CREATE` | `true` | Auto-provisions test accounts |
5. Click **Deploy Web Service**.
6. Note down your public backend URL (e.g. `https://reachinbox-backend.onrender.com`).
7. Verify health: visit `https://reachinbox-backend.onrender.com/health`.

### Step 4: Deploy Background Worker
1. Go to **Dashboard > New + > Background Worker** (or another Web Service on Free Tier running worker).
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `reachinbox-worker`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `node dist/worker.js`
4. Add **Environment Variables**:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Same as backend)*
   - `REDIS_URL`: *(Same as backend)*
   - `SMTP_HOST`: `smtp.ethereal.email`
   - `SMTP_PORT`: `587`
   - `ETHEREAL_AUTO_CREATE`: `true`
5. Click **Deploy**.

### Step 5: Deploy Frontend Static Site
1. Go to **Dashboard > New + > Static Site**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `reachinbox-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `./dist`
4. Configure **Redirects / Rewrites**:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
   *(Also backed up automatically by `frontend/public/_redirects`)*
5. Add **Environment Variable**:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://reachinbox-backend.onrender.com` |
6. Click **Deploy Static Site**.

---

## 🔒 Security Best Practices

- **Never Commit Secrets**: All `.env` files are strictly excluded via `.gitignore`.
- **Database Access**: Internal Render database connections use private hostnames inaccessible from the public internet.
- **CORS Protection**: Dynamic origin validation with wildcard support for `*.onrender.com` preview subdomains and explicit production frontend origins.
- **Safe Authentication**: Passwords hashed with `bcryptjs` (salt rounds: 10), stateless JWT tokens with expiry checks.

---

## 🧪 Post-Deployment Verification Checklist

1. **Health Check**:
   Visit `https://<YOUR-BACKEND>.onrender.com/health`
   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-11-04T...",
     "services": {
       "database": "healthy",
       "redis": "healthy"
     }
   }
   ```
2. **User Registration & Login**:
   Open `https://<YOUR-FRONTEND>.onrender.com` and register a new account or log in with demo credentials.
3. **Schedule an Email**:
   Schedule an email 60 seconds into the future.
4. **Monitor Worker Logs**:
   Open `reachinbox-worker` logs in Render dashboard. Observe:
   - Delay countdown
   - Job processing
   - Ethereal SMTP delivery
   - Preview URL generated
5. **View Sent Emails**:
   Navigate to the **Sent** tab in the dashboard and click the preview link to view the rendered email.
