# ReachInbox – Smart Email Scheduler SaaS

A production-grade, distributed Full-Stack Email Scheduler application built for the **Outbox Labs Software Development Intern Assignment**.

This platform delivers robust, fault-tolerant email scheduling built strictly with **BullMQ persistent delayed jobs**, backed by **Redis AOF (Append-Only File) persistence**, **PostgreSQL** with **Prisma ORM**, a **dedicated background worker process**, and **Nodemailer** integration with **Ethereal Email** test delivery.

---

## 🌐 Live Production Deployment

| Resource | URL |
| :--- | :--- |
| **Live Web App** | [https://reachinbox-email-scheduler-eight-pi.vercel.app](https://reachinbox-email-scheduler-eight-pi.vercel.app) |
| **Backend REST API** | [https://reachinbox-email-scheduler-eight-pi.vercel.app/api](https://reachinbox-email-scheduler-eight-pi.vercel.app/api) |
| **Health Check** | [https://reachinbox-email-scheduler-eight-pi.vercel.app/health](https://reachinbox-email-scheduler-eight-pi.vercel.app/health) |

### 🔑 Demo Login Credentials
- **Email:** `demo@reachinbox.test` *(or use the 1-Click "Fill Demo Credentials" button on screen)*
- **Password:** `reachinbox123`

---

## 🌟 Key Highlights & Engineering Compliance

- 🚫 **Strict Zero-Cron / Zero-Timeout Architecture**: Absolutely no cron jobs (`node-cron`, system crons) and no in-memory `setTimeout` / `setInterval` mechanisms.
- ⚡ **BullMQ Delayed Jobs**: All scheduling is handled via Redis-backed BullMQ delayed sets (`delay: targetTime - Date.now()`).
- 🔄 **Restart-Resilient**: Redis is configured with AOF persistence (`appendonly yes`, `appendfsync everysec`). Delayed jobs persist across system, server, and worker crashes.
- 👷 **Dedicated Worker Process**: Email execution runs in a distinct standalone process (`npm run worker`), decoupled from the Express API server.
- 🔒 **Idempotent Delivery & State Protection**: Multi-step state checks (`SCHEDULED` ➔ `PROCESSING` ➔ `SENT` / `FAILED`) prevent duplicate dispatches even under network partition or process restarts.
- 🔁 **Exponential Backoff Retries**: Up to 3 attempts with exponential backoff (`3s`, `6s`, `12s`).
- 🛑 **Safe Rescheduling & Cancellation**: Dynamic cancellation directly removes pending jobs from the BullMQ delayed set in Redis. Rescheduling removes the previous job and adds an updated delayed job.
- 📧 **Ethereal SMTP Integration**: Real test emails with rendered preview URLs saved and inspectable directly in the dashboard UI.
- 🎨 **Linear / Resend Inspired UI**: Deep charcoal & navy theme, purple and electric blue glow accents, glassmorphic panels, and animated transitions.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide React, Recharts, Framer Motion, Axios |
| **Backend API** | Node.js (v20+), TypeScript, Express.js, REST Architecture, Zod validation, Helmet, CORS, Morgan |
| **Queue & Cache** | BullMQ, Redis 7 (AOF Persistence enabled), IORedis |
| **Database & ORM** | PostgreSQL 16, Prisma ORM, Prisma Migrations & Seed |
| **Email Delivery** | Nodemailer, Ethereal Email SMTP (with dynamic auto-provisioning) |
| **Authentication** | JWT (JSON Web Tokens), Bcrypt.js password hashing |
| **DevOps & Infra** | Docker Compose (PostgreSQL + Redis with healthchecks) |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React.js Frontend (Vite)                   │
│        Linear-style Dashboard • Tailwind CSS • Recharts      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST API + JWT
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express.js Backend Server                  │
│       Zod Validation • Prisma Client • BullMQ Queue         │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
        1. Save Record                 2. Enqueue Delayed Job
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      PostgreSQL 16 DB        │ │       Redis 7 Server       │
│  Users • Emails • Migrations │ │  AOF Enabled • Delayed Set │
└──────────────────────────────┘ └─────────────┬──────────────┘
                                               │
                                       3. Delay Elapses
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Dedicated Worker Process (worker.ts)           │
│   • Checks DB status (Idempotency check)                    │
│   • Updates status to PROCESSING                            │
│   • Sends email via Nodemailer                              │
│   • Retries on failure (3x exponential backoff)             │
│   • Updates status to SENT & records Ethereal Preview URL   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Ethereal Email SMTP Server                  │
│           Generates preview link for each test email        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```text
reachinbox-email-scheduler/
├── docker-compose.yml          # PostgreSQL 16 & Redis 7 with AOF persistence
├── .env.example                # Canonical environment variable blueprint
├── package.json                # Monorepo root scripts
├── README.md                   # Full documentation & setup guide
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (User & Email models)
│   │   └── seed.ts             # Demo data seeder
│   ├── src/
│   │   ├── config/             # Zod environment, Prisma, and Redis setup
│   │   ├── controllers/        # Auth, Email, and Dashboard HTTP handlers
│   │   ├── middleware/         # JWT verification, Zod body validation, error handler
│   │   ├── queues/             # BullMQ queue definition & delayed job helpers
│   │   ├── routes/             # REST API routing definitions
│   │   ├── services/           # Business logic: Auth, Email, and SMTP services
│   │   ├── utils/              # Colored terminal logger, API response wrappers
│   │   ├── validators/         # Zod validation schemas
│   │   ├── workers/            # BullMQ worker processor logic with idempotency
│   │   ├── app.ts              # Express application configuration
│   │   ├── server.ts           # HTTP API entry point
│   │   └── worker.ts           # Dedicated Background Worker process entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
└── frontend/
    ├── src/
    │   ├── api/                # Axios client with JWT interceptor
    │   ├── components/         # Layout, StatusBadges, EmailDetailsModal, EditModal
    │   ├── contexts/           # AuthContext (persistent session management)
    │   ├── pages/              # Dashboard, Schedule, Scheduled, Sent, Failed, Auth
    │   ├── types/              # TypeScript interfaces for Email, Stats, User
    │   ├── App.tsx             # Protected & Public routing
    │   ├── main.tsx
    │   └── index.css           # Tailwind custom glassmorphic styling
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## ⚡ Prerequisites

Make sure the following are installed on your macOS machine:

- **Node.js**: `v20.x` or later (tested on `v24.x`)
- **npm**: `v10.x` or later
- **Docker & Docker Compose** (or local installations of PostgreSQL and Redis)

---

## 🚀 Step-by-Step Installation & Setup

### 1. Clone & Enter Repository

```bash
cd "/Users/ayankadri/Desktop/reachinbox box scheduler"
```

### 2. Configure Environment Variables

Create `.env` inside `backend/` from `.env.example`:

```bash
cp .env.example backend/.env
```

Default contents of `backend/.env`:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/reachinbox?schema=public"

# Redis connection (BullMQ)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets
JWT_SECRET=super-secret-jwt-key-reachinbox-2025-change-me-in-production
JWT_EXPIRES_IN=7d

# Ethereal Email SMTP
# Leave user/pass blank to dynamically auto-generate test credentials on startup
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="ReachInbox Scheduler <scheduler@reachinbox.test>"
ETHEREAL_AUTO_CREATE=true
```

### 3. Start PostgreSQL and Redis (Docker Compose)

Launch containerized PostgreSQL and Redis with AOF persistence:

```bash
docker compose up -d
```

Verify containers are running:

```bash
docker compose ps
```

> **Note for Local Services**: If running PostgreSQL and Redis natively without Docker, ensure Redis is running on port `6379` with `appendonly yes` enabled and PostgreSQL is running on port `5432`.

### 4. Install Dependencies

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
cd ..
```

### 5. Initialize Database & Seed Demo Data

Run Prisma database migrations and seed demo data:

```bash
cd backend
npx prisma db push
npx prisma db seed
cd ..
```

---

## 🖥️ Running the Application

To properly experience the distributed architecture, open **three terminal tabs**:

### Terminal 1: Backend API Server

```bash
cd backend
npm run dev
```

*Starts Express REST API on `http://localhost:5000`.*

### Terminal 2: Dedicated Background Worker Process

```bash
cd backend
npm run worker
```

*Initializes the BullMQ worker listening to delayed queue events and processing SMTP dispatches.*

### Terminal 3: Frontend Dashboard (Vite)

```bash
cd frontend
npm run dev
```

*Starts React dashboard on `http://localhost:5173`.*

---

## 🔑 Login & Demo Credentials

When opening `http://localhost:5173`, you will see the modern login screen.

Click the **"Fill Demo Credentials (1-Click)"** button or enter:

- **Email**: `demo@reachinbox.test`
- **Password**: `reachinbox123`

You can also register a brand new account with any valid email!

---

## 📡 REST API Reference

All `/api/emails` and `/api/dashboard` endpoints require an `Authorization: Bearer <token>` header.

### Authentication Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT token |
| `GET` | `/api/auth/me` | Fetch currently logged-in user profile |

### Email Scheduling Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/emails/schedule` | Schedule an email with future timestamp |
| `GET` | `/api/emails` | List all emails with pagination, search & status filters |
| `GET` | `/api/emails/scheduled`| List active `SCHEDULED` emails |
| `GET` | `/api/emails/sent` | List delivered `SENT` emails with Ethereal preview links |
| `GET` | `/api/emails/failed` | List `FAILED` emails with error telemetry |
| `GET` | `/api/emails/:id` | Retrieve single email details and BullMQ job metadata |
| `PUT` | `/api/emails/:id` | Reschedule / edit an email (updates BullMQ delayed job) |
| `DELETE` | `/api/emails/:id/cancel`| Cancel scheduled email (purges BullMQ delayed job) |
| `POST` | `/api/emails/:id/retry` | Re-queue a failed email for delivery retry |

### Dashboard Telemetry Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Summary statistics (total, scheduled, sent, failed, success rate) |
| `GET` | `/api/dashboard/activity`| 7-day or 30-day chronological activity for charts |

---

## 🧪 Testing Scenarios & Verification

### 1. Test Email Scheduling
1. Navigate to **Schedule Email** (`/schedule`).
2. Enter recipient, subject, and message.
3. Click preset **"⚡ In 1 minute (Fast Demo)"**.
4. Click **Enqueue BullMQ Delayed Job**.
5. Observe the email appear on the **Scheduled Emails** page with status `SCHEDULED`.
6. Watch the terminal logs on **Terminal 2 (Worker)**. Exactly when the delay expires:
   - Worker picks up the job.
   - Status transitions to `PROCESSING` then `SENT`.
   - Ethereal SMTP sends the email and logs a preview link.
7. Open **Sent Emails** (`/sent`) and click **"Open in Ethereal"** to inspect the real rendered email in your browser!

### 2. Verify Cancellation
1. Schedule an email for 10 minutes in the future.
2. In **Scheduled Emails**, click the **Trash icon** (Cancel) and confirm.
3. The job is purged from BullMQ delayed queue and marked `CANCELLED` in PostgreSQL.
4. Even if the worker is running, the email will never be sent.

### 3. Verify Server Restart Resilience
1. Schedule an email for 2 minutes in the future.
2. In Terminal 1, stop the Backend server (`Ctrl+C`).
3. In Terminal 2, stop the Worker (`Ctrl+C`).
4. Wait 15 seconds, then restart both (`npm run dev` and `npm run worker`).
5. Notice that BullMQ retrieves the pending job from Redis AOF, and at the scheduled timestamp, the email is sent without failure or duplicate delivery!

### 4. Run Automated Backend Unit Tests
```bash
cd backend
npm run test
```

---

## 🛡️ Reliability & Edge Case Handling

1. **Past Date Prevention**: Zod schema rejects any timestamps in the past.
2. **Idempotency**: Before sending, the worker queries PostgreSQL for the current status. If the email is already `SENT` or `CANCELLED`, it skips execution to avoid double-sends.
3. **Queue / Database Drift**: If a job triggers but the DB record is missing, the worker gracefully skips.
4. **Permanent Failures**: After 3 failed attempts, status is marked `FAILED` with exact stack trace / error message recorded.
5. **Manual Retry**: Failed emails can be retried with one click from the UI or API.

---

## 📄 License & Credits

Built for the **Outbox Labs Software Development Intern Assignment**.
Crafted with precision using React, TypeScript, Express, BullMQ, Redis, PostgreSQL, and Prisma.

