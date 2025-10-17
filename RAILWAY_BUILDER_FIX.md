# Railway Builder Configuration - Specific Fix

## Your Current Situation

Railway is showing:
- ✓ Branch: `master`
- ✓ Root Directory: `src/transcriber`
- ✗ Error: **"Dockerfile `Dockerfile` does not exist"**
- Note: "The value is set in src/transcriber/railway.json"

## The Problem

Railway is **reading** your railway.json file but **not applying** the builder configuration from it. This means the Builder setting in the Railway dashboard UI needs to be set manually.

## The Solution (2 Minutes Per Service)

### Step 1: Find the Builder Setting

In your Railway service Settings page, look for one of these sections:
- **"Build"** section
- **"Builder"** section
- **"Build Settings"**

### Step 2: Set Builder to DOCKERFILE

You should see a dropdown or selection field labeled:
- "Builder" or
- "Build Method" or
- "Builder Type"

**Action:** Select **"DOCKERFILE"** from the dropdown

### Step 3: Verify Dockerfile Path

Below the Builder selection, there may be a field:
- "Dockerfile Path"
- "Docker File"

**Action:**
- Leave it **empty** (Railway will auto-detect), OR
- Set it to: `Dockerfile`

**IMPORTANT:** This path is relative to your Root Directory (`src/transcriber`), so just `Dockerfile` is correct, NOT `src/transcriber/Dockerfile`

### Step 4: Save and Deploy

1. Click **"Save"** or **"Update"** at the bottom
2. Railway should trigger a new deployment automatically
3. Watch the build logs in the Deployments tab

## What You Should See After This

### In Railway Settings UI:
```
Source:
  Repository: kstephens0331/med-study-partner
  Branch: master
  Root Directory: src/transcriber

Build:
  Builder: DOCKERFILE ← This should now show!
  Dockerfile Path: Dockerfile (or empty)
```

### In Build Logs:
```
✓ Cloning repository
✓ Checking out master branch
✓ Using root directory: src/transcriber
✓ Found Dockerfile at src/transcriber/Dockerfile
✓ Building Docker image...
✓ Step 1/8 : FROM python:3.11-slim
✓ Step 2/8 : WORKDIR /app
...
✓ Successfully built
✓ Starting service
✓ Health check passed
```

### NOT This:
```
✗ Dockerfile `Dockerfile` does not exist
✗ npm ci
✗ @types/zod not found
```

## If You Can't Find the Builder Dropdown

### Option A: Use Railway CLI

```bash
# Navigate to the service directory
cd "c:\Users\usmc3\OneDrive\Documents\Stephens Code Programs\Med-study-planner\med-study-partner\src\transcriber"

# Deploy directly
railway up
```

This will deploy from your local directory and Railway will detect the Dockerfile.

### Option B: Delete and Recreate Service

If the Builder setting doesn't exist or can't be changed:

#### For Transcriber:

1. **Delete old service:**
   - Settings → Danger Zone → Delete Service
   - Confirm deletion

2. **Create new service:**
   - Dashboard → New → GitHub Repo
   - Repository: `kstephens0331/med-study-partner`
   - Branch: `master`
   - **Root Directory: `src/transcriber`** ← Set this during creation!
   - Railway should auto-detect Dockerfile
   - Click Create

3. **Configure environment variables** (if any were set):
   - Copy from old service or set new ones
   - Common vars: `PORT`, `SUPABASE_URL`, etc.

4. **Set up domain:**
   - Settings → Networking → Generate Domain
   - Should get: `https://med-study-transcriber-production.up.railway.app`

#### For Ingestor:

Repeat with:
- Root Directory: `src/ingestor`

## Why This Happens

Railway has two ways to configure the builder:
1. **railway.json file** (what we created)
2. **Dashboard UI setting** (manual configuration)

The dashboard UI setting **overrides** railway.json. If Railway previously detected your project as Node.js (from the root package.json), it may have set the Builder to "NIXPACKS" or "NPM" in the UI, which overrides your railway.json.

## Timeline After Fix

Once Builder is set correctly:
- 0-30s: Railway queues deployment
- 30s-2min: Cloning and Docker setup
- 2-4min: Building image (faster-whisper is large)
- 4-5min: Starting service and health check
- **5min total: ✅ Service live**

## Verification

After 5 minutes, test:

```bash
# Transcriber
curl https://med-study-transcriber-production.up.railway.app/health

# Expected: {"status":"ok"} or similar (NOT 502)
```

## Quick Reference

**What Railway needs to see:**
```
WHERE to look: master branch
WHICH folder: src/transcriber/
WHAT to build with: DOCKERFILE
WHICH dockerfile: Dockerfile (in that folder)
HOW to run: uvicorn app:app --host 0.0.0.0 --port $PORT
```

All of these are set correctly EXCEPT possibly "WHAT to build with" needs manual UI setting.

---

## Exact Steps (TL;DR)

1. Railway Dashboard → Transcriber Service → Settings
2. Find "Build" or "Builder" section
3. Set Builder dropdown to: **DOCKERFILE**
4. Set Dockerfile Path to: **Dockerfile** (or leave empty)
5. Save
6. Wait 5 minutes
7. Test: `curl https://.../health`
8. Repeat for Ingestor service
9. ✅ Done!

---

**ETA to fix:** 2 minutes configuration + 5 minutes build = 7 minutes per service
**Total for both:** ~15 minutes
