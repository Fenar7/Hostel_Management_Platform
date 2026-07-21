# Local Development Environment Setup
### Stayee Anywhere — Developer Guide

> **Status:** Pending Implementation  
> **Last Updated:** July 2026  
> **Author:** CTO / Senior DevOps Engineer

---

## Overview

This document explains how to set up a fully safe local development environment for Stayee, where:
- Your **local app** runs against a **local Docker PostgreSQL** database (cloned from production).
- AWS Cognito and AWS S3 are shared with production (explained below with safety rules).
- **Only merges to `main`** trigger a production deployment on AWS — feature branches are completely isolated.

---

## Architecture

```
[Your Laptop — Local Dev]
  ┌────────────────────────────────────────┐
  │  Next.js (npm run dev)                 │
  │  └── Local Docker Postgres :5432       │  ← your feature branch data
  │  └── AWS Cognito (real, shared)        │  ← no local alternative needed
  │  └── AWS S3 (real, shared, dev/ prefix)│  ← see S3 section below
  └────────────────────────────────────────┘
           │  git push feature/xyz
           ▼
     [GitHub — PR Review]
           │  merge to main
           ▼
     [GitHub Actions]
           │  npm run build → Docker image → ECR
           │  prisma migrate deploy → AWS RDS (prod)
           ▼
     [AWS EC2 — Production]
       staye-production-documents (S3)
       CloudFront URL (live users)
```

---

## Prerequisites

Make sure these are installed before starting:

- [ ] **Docker Desktop** — [download](https://www.docker.com/products/docker-desktop/). Must be running.
- [ ] **AWS CLI v2** — verify with `aws --version`
- [ ] **AWS Session Manager Plugin** — at `C:\Program Files\Amazon\SessionManagerPlugin\bin\`
- [ ] **Node.js 20+** — verify with `node --version`
- [ ] **PostgreSQL CLI tools** (`pg_dump`, `psql`) — [download](https://www.postgresql.org/download/windows/), select "Command Line Tools" only. Verify with `pg_dump --version`

---

## Part 1 — One-Time Setup

### Step 1 — Start Local Docker Postgres

A `docker-compose.yml` already exists in the project root. Run:

```powershell
# In the project root
docker-compose up -d

# Verify it's running — you should see: stayee_anywhere_product-db-1  running
docker ps
```

This starts a local Postgres database:
- **Host:** `localhost:5432`
- **User:** `postgres`
- **Password:** `password`
- **Database:** `staye_local_db`

---

### Step 2 — Clone Production Database Locally

This copies the real AWS RDS data to your local Docker database.

#### 2A — Open SSM Tunnel (new PowerShell window, keep open)

```powershell
$INSTANCE_ID = "i-066e2193c831d8495"
$RDS_HOST = "database-1.cj2woqyom1ds.ap-south-1.rds.amazonaws.com"

& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ssm start-session `
    --target $INSTANCE_ID `
    --document-name AWS-StartPortForwardingSessionToRemoteHost `
    --parameters "{""host"":[""$RDS_HOST""],""portNumber"":[""5432""],""localPortNumber"":[""5433""]}" `
    --region ap-south-1 `
    --profile default
```

> ⚠️ Keep this window open. Port `5433` → AWS RDS.

#### 2B — Dump Production Data (second PowerShell window)

```powershell
pg_dump `
  --host=localhost `
  --port=5433 `
  --username=postgres `
  --dbname=staye_db `
  --no-owner `
  --no-acl `
  --format=plain `
  --file=prod_dump.sql

# Password when prompted: Stayee7865
```

#### 2C — Restore into Local Docker Postgres

```powershell
psql `
  --host=localhost `
  --port=5432 `
  --username=postgres `
  --dbname=staye_local_db `
  --file=prod_dump.sql

# Password when prompted: password
```

#### 2D — Clean Up

```powershell
# Close the SSM tunnel (Ctrl+C in the first window)
# Delete the dump file — it contains sensitive production data
Remove-Item prod_dump.sql
```

---

### Step 3 — Update `.env.local`

Update these lines in `.env.local` to point to the local Docker database:

```env
# ─── LOCAL DOCKER DATABASE ────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:password@localhost:5432/staye_local_db"
DIRECT_URL="postgresql://postgres:password@localhost:5432/staye_local_db"
DB_IS_TUNNEL="false"

# ─── S3 DEV PREFIX (see S3 section below) ─────────────────────────────────────
AWS_S3_KEY_PREFIX="dev/"

# ─── Keep all other values unchanged ──────────────────────────────────────────
```

> ⚠️ `.env.local` is in `.gitignore` — it will never be committed. Safe to store secrets here.

---

### Step 4 — Sync Prisma Migration History

Since the DB was restored from a dump, tell Prisma that all existing migrations are already applied:

```powershell
npx prisma migrate resolve --applied "20260619092505_init"
npx prisma migrate resolve --applied "20260621154506_add_hostel_affidavit_text"
npx prisma migrate resolve --applied "20260627182323_food_dashboard_v2"
npx prisma migrate resolve --applied "20260709000000_add_task_assignment_module"
npx prisma migrate resolve --applied "20260709074717_add_task_assignment_module"

# Verify — all should show as "applied"
npx prisma migrate status
```

---

### Step 5 — Verify

```powershell
npm run dev
```

Open `http://localhost:3000`. You should see the full app with real data, running 100% locally. Nothing is touching AWS production at this point.

---

## Part 2 — Day-to-Day Development Workflow

### Starting Local Dev Each Day

```powershell
# 1. Make sure Docker is running (open Docker Desktop)
# 2. Start the database (if not already running)
docker-compose up -d

# 3. Start the app
npm run dev
```

### Creating a Feature Branch

```powershell
# Always pull latest main first
git checkout main
git pull

# Create your branch
git checkout -b feature/your-feature-name
```

### If You Change the Database Schema (`schema.prisma`)

```powershell
# Create a new migration locally
npx prisma migrate dev --name describe_your_change
```

This creates a new file in `prisma/migrations/` which gets committed alongside your code. When merged to `main`, the GitHub Action runs `prisma migrate deploy` to safely apply it to production.

### Committing and Pushing a Feature Branch

```powershell
git add .
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
```

> ✅ Pushing to a feature branch **does NOT deploy to AWS**. Production is safe.

### Deploying to Production

1. Go to GitHub → your repo → click **"Compare & pull request"**
2. Review changes → **Merge pull request** into `main`
3. GitHub Actions automatically:
   - Builds the Docker image
   - Pushes to AWS ECR
   - Runs `prisma migrate deploy` on production RDS
   - Restarts the EC2 container
   - **CloudFront is live in ~5 minutes**

---

## Part 3 — AWS Services: What's Shared vs. Local

| Service | Local or Shared? | Notes |
|---|---|---|
| **PostgreSQL Database** | ✅ Local (Docker) | Completely isolated. Safe to mess with. |
| **AWS Cognito** | ☁️ Shared (real AWS) | No local alternative needed. Login works fine. |
| **AWS S3** | ☁️ Shared (real AWS) | Uses `dev/` prefix to separate test uploads (see below). |

---

## Part 4 — S3 File Uploads in Local Dev

**The problem:** Since Cognito doesn't have a local version, your local app uses the real AWS S3 bucket (`staye-production-documents`). Any files you upload while testing locally land in the same bucket as real production documents.

**The solution:** Prefix all local uploads with `dev/` so they are clearly separated from real user files.

### Implementation (Pending)

Two changes are needed when ready to implement:

**1. Add to `.env.local`:**
```env
AWS_S3_KEY_PREFIX="dev/"
```

**2. Update `lib/storage/index.ts`:**
```ts
const KEY_PREFIX = process.env.AWS_S3_KEY_PREFIX || "";

// In uploadToStorage():
Key: `${KEY_PREFIX}${path}`,
```

**3. Periodically clean up dev files:**
Go to [AWS S3 Console](https://s3.console.aws.amazon.com) → `staye-production-documents` → `dev/` folder → delete all.

> 💡 No extra bucket needed. No extra cost. Clean separation.

---

## Part 5 — Refreshing Local Data from Production

Over time, your local database will drift from production (new users sign up, data changes). To re-sync:

1. Repeat **Step 2** (dump and restore) from Part 1 above.
2. Run `npx prisma migrate status` to confirm all migrations are applied.

Do this once every few weeks or whenever you need realistic fresh data.

---

## Pre-Merge Checklist (Before Every PR to Main)

- [ ] `npm run build` passes with zero errors.
- [ ] The feature works correctly in the browser on `localhost:3000`.
- [ ] If `schema.prisma` was changed, a new migration file exists in `prisma/migrations/`.
- [ ] No debug files, test scripts, or secrets are accidentally included in the commit.
- [ ] Check `git diff --stat` — only intended files are changed.

---

## Troubleshooting

### `docker-compose up -d` fails — port 5432 already in use
```powershell
# Find what's using port 5432
netstat -ano | Select-String 5432
# Kill the process or change the port in docker-compose.yml to 5433
```

### `psql` not found
Install PostgreSQL command line tools from https://www.postgresql.org/download/windows/ — select "Command Line Tools" only during installation.

### Prisma migration status shows pending migrations
```powershell
npx prisma migrate deploy
```

### App shows no data after setup
The prod dump may have been empty or the restore failed silently. Re-run Step 2C and check for errors.
