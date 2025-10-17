# Railway Configuration Fix

## Problem
Railway is detecting the root `package.json` and trying to build the Python services (transcriber & ingestor) as Node.js applications, causing build failures.

## Root Cause
Railway services are configured to deploy from the repository root, but they should be deploying from their specific subdirectories using Docker.

## Solution

### Option 1: Configure Root Directory in Railway Dashboard (Recommended)

For **both** transcriber and ingestor services:

1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select the service (transcriber or ingestor)
3. Go to **Settings**
4. Scroll to **Build** section
5. Set **Root Directory**:
   - For transcriber: `src/transcriber`
   - For ingestor: `src/ingestor`
6. Set **Builder** to: `DOCKERFILE`
7. Click **Save**
8. Click **Deploy** to trigger a new build

### Option 2: Add railway.json Config Files

Alternatively, create config files in the service directories:

#### For Transcriber
Create `src/transcriber/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### For Ingestor
Create `src/ingestor/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Option 3: Create railway.toml in Root

Create `railway.toml` in the repository root:

```toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "uvicorn app:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

But this requires each service to be in its own Railway project.

## Recommended Approach

**Use Option 1** (Railway Dashboard configuration):
- Fastest solution
- No code changes needed
- Clean separation of concerns
- Easy to verify and modify

## Step-by-Step Guide

### Transcriber Service

1. Login to Railway: https://railway.app/dashboard
2. Navigate to your transcriber service
3. Click **Settings** tab
4. Find **Source** section:
   - **Root Directory**: `src/transcriber`
5. Find **Build** section:
   - **Builder**: Select `DOCKERFILE`
   - **Dockerfile Path**: `Dockerfile` (should be default)
6. Click **Save Changes**
7. Go to **Deployments** tab
8. Click **Deploy** button (or it may auto-deploy)

### Ingestor Service

Repeat the same steps:
1. Navigate to ingestor service in Railway
2. **Settings** → **Source**
   - **Root Directory**: `src/ingestor`
3. **Settings** → **Build**
   - **Builder**: `DOCKERFILE`
   - **Dockerfile Path**: `Dockerfile`
4. Save and deploy

## Verification

After deployment, test the services:

```bash
# Test transcriber
curl https://med-study-transcriber-production.up.railway.app/health

# Expected: {"status": "ok"} or similar

# Test ingestor
curl https://med-study-ingestor-production.up.railway.app/health

# Expected: {"status": "ok"} or similar
```

## Why This Happened

Railway's auto-detection saw:
1. A `package.json` in the repository root
2. Assumed it's a Node.js project
3. Tried to run `npm ci` and found `@types/zod` reference (possibly in package-lock.json from a previous state)
4. Failed because the services are actually Python/Docker based

By setting the **Root Directory** and **Builder**, we explicitly tell Railway:
- Where to find the service code
- How to build it (using Dockerfile, not npm)

## Current Status

- ❌ Transcriber: Failing (Node.js detection error)
- ❌ Ingestor: Likely same issue
- ✅ Fix: Configure root directories in Railway dashboard

## Timeline

- Configuration change: **2 minutes**
- Railway rebuild + deploy: **3-5 minutes per service**
- Total time to fix: **~10 minutes**

---

**Last Updated:** 2025-10-17
**Next Action:** Configure Railway services via dashboard
