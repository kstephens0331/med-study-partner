# Railway Services - Complete Fix Guide

## Current Error
```
Could not find root directory: src/transcriber
Dockerfile `Dockerfile` does not exist
```

## Root Cause
Railway's service configuration has **3 issues**:
1. Deploying from wrong branch (`af/stage` instead of `master`)
2. Root directory not set or set incorrectly
3. Dockerfile path not relative to root directory

## The Complete Solution

### For EACH Service (Transcriber & Ingestor)

Go to Railway Dashboard → Service → Settings and configure **ALL THREE** settings:

#### 1. Source Settings
```
Repository: kstephens0331/med-study-partner
Branch: master  ← Change this!
Root Directory: src/transcriber  ← Set this!
```

#### 2. Build Settings
```
Builder: DOCKERFILE
Watch Paths: (leave empty or default)
```

#### 3. Deploy Settings
```
Start Command: (leave empty - railway.json handles this)
```

### Exact Values

**Transcriber Service:**
- Branch: `master`
- Root Directory: `src/transcriber`
- Builder: `DOCKERFILE`
- Dockerfile Path: `Dockerfile` (default, should auto-fill)

**Ingestor Service:**
- Branch: `master`
- Root Directory: `src/ingestor`
- Builder: `DOCKERFILE`
- Dockerfile Path: `Dockerfile` (default, should auto-fill)

---

## Step-by-Step (Screenshot Guide)

### Step 1: Select Service
1. Go to https://railway.app/dashboard
2. Click on **transcriber** service (do ingestor after)

### Step 2: Open Settings
1. Click **"Settings"** tab at top
2. You should see multiple sections

### Step 3: Configure Source
Look for **"Source"** or **"Repository"** section:

```
┌────────────────────────────────────┐
│ Source                             │
├────────────────────────────────────┤
│ Repository                         │
│ ┌────────────────────────────────┐ │
│ │ kstephens0331/med-study-partner│ │
│ └────────────────────────────────┘ │
│                                    │
│ Branch                             │
│ ┌────────────────────────────────┐ │
│ │ master                     ▼   │ │ ← CHANGE THIS
│ └────────────────────────────────┘ │
│                                    │
│ Root Directory                     │
│ ┌────────────────────────────────┐ │
│ │ src/transcriber                │ │ ← SET THIS
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**IMPORTANT:**
- Don't use leading slash: `src/transcriber` ✅
- Not: `/src/transcriber` ❌

### Step 4: Configure Build
Look for **"Build"** or **"Deploy"** section:

```
┌────────────────────────────────────┐
│ Build                              │
├────────────────────────────────────┤
│ Builder                            │
│ ┌────────────────────────────────┐ │
│ │ DOCKERFILE             ▼       │ │ ← SELECT THIS
│ └────────────────────────────────┘ │
│                                    │
│ Dockerfile Path (optional)         │
│ ┌────────────────────────────────┐ │
│ │ Dockerfile                     │ │ ← Should auto-fill
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

### Step 5: Save & Deploy
1. Scroll down and click **"Save"** or **"Update"**
2. Railway should trigger a new deployment automatically
3. If not, click **"Deploy"** button in Deployments tab

### Step 6: Monitor Build
1. Go to **"Deployments"** tab
2. Click on the latest deployment
3. Watch the logs

**Expected logs:**
```
✓ Cloning repository
✓ Checking out master branch
✓ Using root directory: src/transcriber
✓ Found Dockerfile
✓ Building Docker image
✓ Step 1/X : FROM python:3.11-slim
...
✓ Successfully built
✓ Starting service
✓ Health check passed
```

### Step 7: Verify
After 5 minutes:
```bash
curl https://med-study-transcriber-production.up.railway.app/health
```

Should return: `{"status":"ok"}` or similar

### Step 8: Repeat for Ingestor
Do the exact same steps for ingestor service:
- Branch: `master`
- Root Directory: `src/ingestor`
- Builder: `DOCKERFILE`

---

## Alternative: Environment Variables Method

If the above doesn't work, try setting via environment variables:

1. Go to **Variables** tab in Railway
2. Add these variables:

```
RAILWAY_DOCKERFILE_PATH=Dockerfile
RAILWAY_ROOT_PATH=src/transcriber
```

Then redeploy.

---

## Alternative: Railway CLI Method

If you have Railway CLI installed:

```bash
# For transcriber
cd src/transcriber
railway up

# For ingestor
cd src/ingestor
railway up
```

This deploys from the current directory.

---

## Troubleshooting

### Issue: "Could not find root directory"

**Possible causes:**
1. Branch is not `master`
2. Root directory has leading slash (`/src/transcriber` instead of `src/transcriber`)
3. Root directory has typo
4. Railway hasn't pulled latest code

**Solutions:**
- Double-check branch is `master`
- Remove leading slash from root directory
- Verify spelling: `src/transcriber` (not `transcriber` or `src/transcibe`)
- Trigger manual deploy after saving settings

### Issue: "Dockerfile does not exist"

**Possible causes:**
1. Root directory not set correctly
2. Dockerfile path is absolute instead of relative
3. Railway looking at wrong branch

**Solutions:**
- Root directory MUST be set to `src/transcriber`
- Dockerfile path should be `Dockerfile` (relative to root directory)
- Branch MUST be `master`

### Issue: Still using npm

**Cause:** Settings not saved or Railway using old deployment

**Solution:**
1. Go to Settings
2. Scroll to bottom
3. Click "Delete Service"
4. Create new service:
   - Connect to GitHub repo
   - Select `master` branch
   - Set root directory to `src/transcriber`
   - Railway should auto-detect Dockerfile

---

## Nuclear Option: Recreate Service

If nothing works, delete and recreate:

### Transcriber Service

1. **Delete old service:**
   - Settings → Danger Zone → Delete Service

2. **Create new service:**
   - Dashboard → New → GitHub Repo
   - Select: `kstephens0331/med-study-partner`
   - Branch: `master`
   - Root Directory: `src/transcriber`
   - Railway auto-detects Dockerfile
   - Add environment variables if needed

3. **Set domain:**
   - Settings → Networking
   - Generate domain
   - Copy URL for testing

### Ingestor Service

Repeat same steps with:
- Root Directory: `src/ingestor`

---

## Verification Checklist

After configuration, verify these settings:

- [ ] Repository: `kstephens0331/med-study-partner`
- [ ] Branch: `master` (not `af/stage/...`)
- [ ] Root Directory: `src/transcriber` (no leading `/`)
- [ ] Builder: `DOCKERFILE`
- [ ] Dockerfile Path: `Dockerfile` (or empty)
- [ ] Build logs show Docker, not npm
- [ ] Service deployed successfully
- [ ] Health check returns 200 OK

---

## File Structure Reference

For Railway to work, it needs to find:

```
med-study-partner/           ← Repository root
└── src/
    └── transcriber/         ← Root Directory setting
        ├── Dockerfile       ← Railway looks here
        ├── railway.json     ← Railway reads config
        ├── requirements.txt ← Docker uses this
        └── app.py          ← FastAPI app
```

**Railway's perspective after configuration:**
1. Clone repository
2. Checkout `master` branch
3. Change to `src/transcriber/` directory
4. Find `Dockerfile` in current directory
5. Build Docker image
6. Run `uvicorn app:app` (from railway.json)

---

## Expected Timeline

- Configuration changes: 2 minutes per service
- Railway detects changes: 30 seconds
- Docker build: 3-5 minutes (faster-whisper is large)
- Service startup: 30 seconds
- Health check: 10 seconds

**Total:** ~7 minutes per service, 15 minutes for both

---

## Success Indicators

You'll know it's working when:

1. **Build logs show:**
   ```
   Building Docker image
   Successfully built
   ```

2. **NOT showing:**
   ```
   npm ci
   @types/zod error
   ```

3. **Health check works:**
   ```bash
   $ curl https://..../health
   {"status":"ok"}
   ```

4. **In app:**
   - Go to Materials tab
   - Upload PDF/PPTX
   - Processes successfully ✅

---

## After Both Services Work

1. ✅ Apply RLS migration in Supabase
2. ✅ Test end-to-end in application
3. ✅ **100% Ready for Beta!**

---

## Need Help?

If you're still stuck:
1. Screenshot your Railway Settings page
2. Share the build logs from Deployments tab
3. Verify files exist on master: https://github.com/kstephens0331/med-study-partner/tree/master/src/transcriber

---

**The key is getting all three settings right: Branch (`master`), Root Directory (`src/transcriber`), and Builder (`DOCKERFILE`). Once these are set correctly, Railway will work!**
