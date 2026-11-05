# ReachInbox – Production Deployment Guide

This guide details the complete production deployment of the **ReachInbox Smart Email Scheduler** SaaS application:
- **Frontend**: Deployed on **Vercel** (Global Edge CDN, Vite + React 18, SPA routing)
- **Backend API**: Deployed on **Render** (Node.js Express REST API)
- **Background Worker**: Deployed on **Render** (Dedicated BullMQ Delayed Worker)
- **Database**: **Render PostgreSQL 16** (Prisma ORM with auto-migrations)
- **Redis Queue**: **Render Key Value / Redis 7** (Persistent AOF & `noeviction` policy)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ReachInbox Frontend (Vercel)                 │
│              React 18 • Vite • Tailwind CSS • SPA Routing       │
│                URL: https://reachinbox-scheduler.vercel.app     │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTPS REST API Calls (Bearer JWT)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ReachInbox Backend (Render)                  │
│                Node.js 20 • Express REST API • Zod              │
│                URL: https://reachinbox-backend.onrender.com     │
└────────────────┬───────────────────────────────┬────────────────┘
                 │                               │
          1. Save Record                  2. Enqueue Delayed Job
                 │                               │
                 ▼                               ▼
┌────────────────────────────────┐ ┌──────────────────────────────┐
│     Render PostgreSQL 16       │ │    Render Redis Key-Value    │
│     Users • Emails • Prisma    │ │    Delayed Set • Noeviction  │
└────────────────────────────────┘ └─────────────┬────────────────┘
                                                 │
                                          3. Delay Elapses
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              ReachInbox Dedicated Worker (Render)               │
│                BullMQ Worker • Idempotency Check                │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Ethereal Email SMTP Service                  │
│             Renders live preview URLs for each test email       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Part 1: Deploying Backend & Database on Render

Deploy the backend first so you have your live Backend API URL ready for the Vercel frontend.

### Step 1.1: Deploy PostgreSQL Database
1. Go to [dashboard.render.com](https://dashboard.render.com).
2. Click **New + > PostgreSQL**.
3. Settings:
   - **Name**: `reachinbox-db`
   - **Database**: `reachinbox`
   - **User**: `reachinbox_user`
   - **Region**: Oregon (or your preferred region)
   - **Plan**: Free
4. Click **Create Database**.
5. Copy the **Internal Database URL** (e.g., `postgresql://reachinbox_user:...@dpg-...-a/reachinbox`).

### Step 1.2: Deploy Redis Key-Value Store
1. In Render Dashboard, click **New + > Redis** (or Key Value).
2. Settings:
   - **Name**: `reachinbox-redis`
   - **Plan**: Free
   - **Maxmemory Policy**: `noeviction` *(critical for BullMQ delayed jobs)*
3. Click **Create Redis**.
4. Copy the **Internal Redis Connection String** (e.g., `redis://red-...:6379`).

### Step 1.3: Deploy Backend Web Service (Express API)
1. In Render Dashboard, click **New + > Web Service**.
2. Connect your GitHub repository (`reachinbox-email-scheduler`).
3. Configure settings:
   - **Name**: `reachinbox-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Pre-Deploy Command**: `npx prisma migrate deploy`
   - **Start Command**: `node dist/server.js`
   - **Health Check Path**: `/health`
   - **Plan**: Free
4. Add **Environment Variables**:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production environment |
   | `PORT` | `10000` | Render default port |
   | `DATABASE_URL` | *(Paste Internal DB URL from Step 1.1)* | PostgreSQL connection |
   | `REDIS_URL` | *(Paste Internal Redis URL from Step 1.2)* | Redis connection |
   | `JWT_SECRET` | *(Click "Generate" or set secure string)* | JWT auth secret |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry |
   | `FRONTEND_URL` | `https://*.vercel.app` *(or your Vercel URL)* | CORS allowed origin |
   | `SMTP_HOST` | `smtp.ethereal.email` | Ethereal test host |
   | `SMTP_PORT` | `587` | Ethereal test port |
   | `ETHEREAL_AUTO_CREATE` | `true` | Auto-generate test inbox |
5. Click **Create Web Service**.
6. Once deployed, note down your Public Backend URL (e.g., `https://reachinbox-backend.onrender.com`).
7. Verify health: visit `https://reachinbox-backend.onrender.com/health` (should return `{"status":"healthy"}`).

### Step 1.4: Deploy Background Worker
1. In Render Dashboard, click **New + > Background Worker** (or another Web Service on free tier).
2. Connect your repository.
3. Configure settings:
   - **Name**: `reachinbox-worker`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `node dist/worker.js`
4. Add environment variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Same as backend)*
   - `REDIS_URL`: *(Same as backend)*
   - `SMTP_HOST`: `smtp.ethereal.email`
   - `SMTP_PORT`: `587`
   - `ETHEREAL_AUTO_CREATE`: `true`
5. Click **Create Background Worker**.

---

## ⚡ Part 2: Deploying Frontend on Vercel

### Step 2.1: Import Project in Vercel
1. Log into [vercel.com](https://vercel.com).
2. Click **Add New... > Project**.
3. Select your GitHub repository (`reachinbox-email-scheduler`) and click **Import**.

### Step 2.2: Configure Project Settings
In the Vercel project configuration screen:
1. **Framework Preset**: Vercel will automatically detect **Vite**.
2. **Root Directory**: Click **Edit** next to Root Directory and set it to:
   ```
   frontend
   ```
   *(Crucial: Points Vercel directly to the frontend package within the monorepo)*
3. **Build & Output Settings**:
   - **Build Command**: `npm run build` (or leave as default `vite build`)
   - **Output Directory**: `dist` (default for Vite)
   - **Install Command**: `npm install`

### Step 2.3: Set Environment Variables
Under the **Environment Variables** section, add:
| Key | Value | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Your Render Backend URL | `https://reachinbox-backend.onrender.com` |

*(Note: The frontend code automatically normalizes the URL to append `/api` if omitted, so either `https://...onrender.com` or `https://...onrender.com/api` works perfectly!)*

### Step 2.4: Deploy
1. Click **Deploy**.
2. Vercel builds the React + Vite application and deploys it to its global edge network.
3. Once complete, you will receive your live frontend URL (e.g., `https://reachinbox-scheduler.vercel.app`).

### Step 2.5: SPA Routing Check (404 Prevention)
The repository includes [`frontend/vercel.json`](file:///Users/ayankadri/Desktop/reachinbox%20box%20scheduler/frontend/vercel.json):
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
This guarantees that refreshing any page (such as `/scheduled`, `/sent`, or `/login`) routes cleanly to `/index.html` without 404 errors.

---

## 🔄 Part 3: Connecting Frontend and Backend

1. **In Vercel**: Ensure `VITE_API_BASE_URL` is set to your live Render backend URL (`https://<your-backend>.onrender.com`).
2. **In Render Backend**:
   - Go to **Environment** in your `reachinbox-backend` service.
   - Set `FRONTEND_URL` to your Vercel URL (e.g. `https://reachinbox-scheduler.vercel.app`).
   - *(Note: The backend CORS middleware already includes built-in wildcard support for `https://*.vercel.app`, so preview branches and deployments work automatically!)*

---

## 🧪 Post-Deployment Verification Checklist

1. **Verify Backend Health**:
   Visit `https://<your-backend>.onrender.com/health`
   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-...",
     "services": {
       "database": "healthy",
       "redis": "healthy"
     }
   }
   ```

2. **Verify Frontend UI**:
   Open your Vercel URL (e.g. `https://reachinbox-scheduler.vercel.app`).

3. **Verify SPA Routing & Page Refresh**:
   Navigate to the `/scheduled` page and press **Refresh (F5)** in your browser. Verify the page reloads cleanly without a 404.

4. **Verify Authentication**:
   Log in with demo credentials or register a new user:
   - **Email**: `demo@reachinbox.test`
   - **Password**: `reachinbox123`

5. **Verify Delayed Email Scheduling**:
   - Navigate to **Schedule Email**.
   - Schedule an email 60 seconds into the future.
   - Check the **Scheduled** list to verify the job appears.
   - Wait 60 seconds, then check the **Sent** tab.
   - Click the **Ethereal Preview URL** to inspect the rendered test email.
