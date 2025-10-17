# Railway Dashboard Setup - Quick Guide

## Current Issue
Railway is still detecting Node.js and trying to run `npm ci`, which fails because it's looking at the root package.json instead of using the Docker configuration.

**Error:** `npm error 404  '@types/zod@^3.22.4' is not in this registry.`

## Why This Happens
Even though we added `railway.json` files, Railway **still needs to be told which directory to look in**. Without setting the root directory, Railway looks at the repository root, finds package.json, and thinks it's a Node.js project.

## The Fix (5 Minutes Per Service)

### Prerequisites
- Access to Railway dashboard: https://railway.app/dashboard
- GitHub connected to Railway
- Repository: `kstephens0331/med-study-partner`

---

## Step-by-Step: Transcriber Service

### 1. Navigate to Service
1. Go to https://railway.app/dashboard
2. Find and click on **"med-study-transcriber-production"** service
   - Or whatever your transcriber service is named

### 2. Open Settings
1. Click the **"Settings"** tab at the top
2. You should see various configuration sections

### 3. Configure Source
1. Find the **"Source"** section
2. Look for **"Root Directory"** field
3. Enter: `src/transcriber`
4. This tells Railway: "Look in src/transcriber, not the repository root"

### 4. Configure Build (if needed)
1. Find the **"Build"** section
2. If there's a **"Builder"** dropdown:
   - Select **"DOCKERFILE"**
3. If there's a **"Dockerfile Path"** field:
   - Enter: `Dockerfile` (or leave default)

### 5. Save and Deploy
1. Click **"Save"** or **"Update"** button
2. Railway should automatically trigger a new deployment
3. If not, click **"Deploy"** button manually
4. Watch the build logs - should now use Docker, not npm

### 6. Expected Build Logs
You should see:
```
✓ Building Docker image
✓ Installing Python dependencies
✓ Running uvicorn
✓ Service healthy
```

**NOT:**
```
npm ci
npm error 404 @types/zod
ERROR: failed to build
```

---

## Step-by-Step: Ingestor Service

Repeat the exact same steps for the ingestor service:

1. Navigate to **"med-study-ingestor-production"** service
2. Open **Settings**
3. Set **Root Directory** to: `src/ingestor`
4. Set **Builder** to: `DOCKERFILE` (if option exists)
5. Save and deploy
6. Watch build logs

---

## Verification

### While Building (3-5 minutes)
Check the **"Deployments"** tab and click on the latest deployment to see logs.

**Good signs:**
- ✅ "Building Docker image"
- ✅ "Installing from requirements.txt"
- ✅ "Successfully built"
- ✅ "Deployment live"

**Bad signs:**
- ❌ "npm ci"
- ❌ "@types/zod not found"
- ❌ "failed to build"

### After Deployment
Test the health endpoints:

```bash
# Transcriber
curl https://med-study-transcriber-production.up.railway.app/health

# Ingestor
curl https://med-study-ingestor-production.up.railway.app/health
```

**Expected Response:**
```json
{"status": "ok"}
```
Or similar (NOT a 502 error)

---

## Common Issues & Solutions

### Issue 1: Can't Find "Root Directory" Field

**Solution:** Look under different sections:
- Try "Source" section first
- Sometimes under "Deploy" section
- May be labeled as "Working Directory" or "Service Root"

### Issue 2: No "Builder" Dropdown

**Solution:** That's okay! If Railway detects the Dockerfile once you set the root directory, it should use it automatically. The `railway.json` we created will handle this.

### Issue 3: Build Still Fails with npm Error

**Possible causes:**
1. Root directory not saved - try saving again
2. Using wrong directory path - double-check: `src/transcriber` (no leading slash)
3. Railway cache - try **"Clear Build Cache"** in settings, then redeploy

**Solution:**
- Delete the service and recreate it with correct root directory from start
- OR contact Railway support

### Issue 4: Service Builds but Crashes Immediately

**Check:**
- PORT environment variable is set
- Health check path is `/health`
- Dockerfile is correct

---

## What Each File Does

### Files in Repository
- `src/transcriber/Dockerfile` - Instructions for building Docker image
- `src/transcriber/requirements.txt` - Python dependencies (including python-multipart)
- `src/transcriber/app.py` - FastAPI application
- `src/transcriber/railway.json` - Railway configuration (tells it to use Docker)

### Railway Dashboard Settings
- **Root Directory** - Where Railway looks for files (MUST be set manually)
- **Builder** - How Railway builds (should auto-detect from railway.json or Dockerfile)

---

## Screenshot Checklist (What to Look For)

When you're in Railway Settings, you should see:

```
┌─────────────────────────────────────────┐
│ Settings                                │
├─────────────────────────────────────────┤
│                                         │
│ Source                                  │
│ ├─ Repository: med-study-partner       │
│ ├─ Branch: master                       │
│ └─ Root Directory: [src/transcriber]   │ ← Set this!
│                                         │
│ Build                                   │
│ ├─ Builder: [DOCKERFILE]                │ ← Or auto-detect
│ └─ Dockerfile Path: Dockerfile         │
│                                         │
│ Deploy                                  │
│ └─ Start Command: (auto from railway.json)
│                                         │
└─────────────────────────────────────────┘
```

---

## Timeline

Once you configure the root directory:

- **0-30 seconds:** Railway detects change, queues deployment
- **30s-2min:** Building Docker image
- **2-4min:** Installing Python packages (faster-whisper takes time)
- **4-5min:** Service starting and health check
- **5min:** ✅ Service live and healthy

**Total per service:** ~5 minutes
**For both services:** ~10 minutes total

---

## After Both Services Are Live

### Final Tests

1. **Test transcriber:**
   ```bash
   curl -X POST https://med-study-transcriber-production.up.railway.app/transcribe \
     -F "audio=@test.mp3"
   ```

2. **Test ingestor:**
   ```bash
   curl -X POST https://med-study-ingestor-production.up.railway.app/extract \
     -F "file=@test.pdf"
   ```

3. **Test from app:**
   - Go to https://med-study-partner.vercel.app
   - Login
   - Navigate to Materials tab
   - Upload a PDF or PPTX
   - Should process successfully ✅

---

## Next Step After This

Once Railway services are working:
- Apply RLS migration in Supabase (see migration file)
- Do end-to-end testing
- **You're 100% ready for beta!** 🎉

---

## Need Help?

If you're stuck after following these steps:
1. Check Railway's status page: https://status.railway.app
2. Look at full deployment logs in Railway dashboard
3. Verify the files exist in GitHub: https://github.com/kstephens0331/med-study-partner/tree/master/src/transcriber
4. Try clearing Railway's build cache and redeploying

---

**Last Updated:** 2025-10-17
**Current Status:** Waiting for Railway dashboard configuration
**ETA to Fix:** 10 minutes (5 min per service)
