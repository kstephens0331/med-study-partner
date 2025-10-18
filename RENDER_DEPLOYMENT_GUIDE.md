# Deploying to Render.com - Step-by-Step Guide

## Why Render Instead of Railway?

Railway has persistent issues with:
- Not recognizing Dockerfiles even when properly configured
- Ignoring railway.json and railway.toml configuration
- Unclear Builder settings in UI

Render.com has **perfect Docker support** and is more reliable for FastAPI applications.

---

## Prerequisites

- GitHub account with repo: `kstephens0331/med-study-partner`
- Dockerfiles in `src/transcriber/` and `src/ingestor/` (already done ✅)

---

## Step 1: Create Render Account

1. Go to https://render.com
2. Click "**Get Started**" or "**Sign Up**"
3. Choose "**Sign up with GitHub**"
4. Authorize Render to access your GitHub repos
5. You'll land on the Render Dashboard

---

## Step 2: Deploy Transcriber Service

### 2.1: Create New Web Service

1. In Render Dashboard, click "**New +**" button (top right)
2. Select "**Web Service**"

### 2.2: Connect Repository

1. Find your repository: `kstephens0331/med-study-partner`
   - If you don't see it, click "**Configure account**" and grant access
2. Click "**Connect**" next to your repository

### 2.3: Configure Service

Fill in these settings:

**Basic Settings:**
- **Name**: `med-study-transcriber`
- **Region**: Choose closest to you (e.g., `Oregon (US West)` or `Ohio (US East)`)
- **Branch**: `master`
- **Root Directory**: `src/transcriber` ⚠️ CRITICAL - Railway failed here
- **Environment**: `Docker` ⚠️ Render will auto-detect from Dockerfile

**Build & Deploy:**
- **Dockerfile Path**: `Dockerfile` (Render auto-fills this after detecting)
- Render will show: "✓ Dockerfile detected"

**Instance Type:**
- **Free** (or choose paid if you need better performance)
  - Free tier: 512 MB RAM, shared CPU
  - Note: Free services spin down after 15 min of inactivity (cold starts)

**Advanced Settings (Optional):**
- **Health Check Path**: `/health`
- **Auto-Deploy**: `Yes` (deploys on every push to master)

### 2.4: Environment Variables

For transcriber, you can optionally add:
- Key: `WHISPER_MODEL`
- Value: `base` (or `small`, `medium` for better accuracy but slower)

Click "**Create Web Service**"

### 2.5: Wait for Deployment

- Render will clone your repo
- Build the Docker image (3-5 minutes first time)
- Start the service
- You'll see live build logs

**Success looks like:**
```
==> Cloning from https://github.com/kstephens0331/med-study-partner...
==> Using Dockerfile at src/transcriber/Dockerfile
==> Building...
Step 1/8 : FROM python:3.11-slim
Step 2/8 : RUN apt-get update && apt-get install -y ffmpeg
...
==> Build successful
==> Starting service
==> Your service is live 🎉
```

### 2.6: Get Service URL

After deployment succeeds:
- Render gives you a URL like: `https://med-study-transcriber.onrender.com`
- Save this URL!

### 2.7: Test Health Endpoint

Open browser or run:
```bash
curl https://med-study-transcriber.onrender.com/health
```

Expected response:
```json
{"status":"healthy","service":"transcriber"}
```

---

## Step 3: Deploy Ingestor Service

Repeat Step 2 with these changes:

**Configuration:**
- **Name**: `med-study-ingestor`
- **Root Directory**: `src/ingestor`
- **Environment**: `Docker`
- **No environment variables needed**

**Expected URL:**
- `https://med-study-ingestor.onrender.com`

**Test:**
```bash
curl https://med-study-ingestor.onrender.com/health
```

---

## Step 4: Update Vercel Environment Variables

Now that your services are deployed on Render, update your Vercel project:

### 4.1: Go to Vercel Dashboard

1. Visit https://vercel.com/dashboard
2. Select your project: `med-study-partner`
3. Go to "**Settings**" → "**Environment Variables**"

### 4.2: Update Service URLs

Find and update these variables:

**Old (Railway URLs - not working):**
```
NEXT_PUBLIC_TRANSCRIBER_URL = https://med-study-transcriber-production.up.railway.app/transcribe
NEXT_PUBLIC_INGESTOR_URL = https://med-study-ingestor-production.up.railway.app/extract
```

**New (Render URLs):**
```
NEXT_PUBLIC_TRANSCRIBER_URL = https://med-study-transcriber.onrender.com/transcribe
NEXT_PUBLIC_INGESTOR_URL = https://med-study-ingestor.onrender.com/extract
```

(Note: Your exact Render URLs might be slightly different - use the ones from Step 2.6 and 3)

### 4.3: Also update .env.production locally

Edit your local file:
```bash
# File: med-study-partner/.env.production
TRANSCRIBE_URL=https://med-study-transcriber.onrender.com/transcribe
INGESTOR_URL=https://med-study-ingestor.onrender.com/extract
```

Commit and push:
```bash
git add .env.production
git commit -m "Update service URLs to Render.com"
git push origin master
```

### 4.4: Redeploy Vercel

After updating environment variables in Vercel:
- Vercel will automatically redeploy
- Or manually trigger: Deployments → "..." → "Redeploy"

---

## Step 5: End-to-End Testing

### 5.1: Test Material Upload

1. Go to https://med-study-partner.vercel.app
2. Login with your account
3. Navigate to "**Materials**" tab
4. Click "**Upload Material**"
5. Upload a PDF or PPTX file
6. Verify it processes successfully

### 5.2: Test Transcription

1. Go to "**AI Coach**" tab
2. Try "**Lecture Mode**" or upload audio
3. Verify transcription works

### 5.3: Verify All Services

```bash
# Main app
curl https://med-study-partner.vercel.app

# Transcriber
curl https://med-study-transcriber.onrender.com/health

# Ingestor
curl https://med-study-ingestor.onrender.com/health
```

All should return successful responses.

---

## Free Tier Limitations

Render Free tier has these limits:
- **Services spin down after 15 minutes of inactivity**
  - First request after spin-down takes 30-60 seconds (cold start)
  - Subsequent requests are fast
- **750 hours/month total across all free services**
- **100 GB bandwidth/month**

For beta testing, this should be fine. If you need instant responses, upgrade to paid tier ($7/month per service).

---

## Advantages Over Railway

✅ **Dockerfile actually detected and used**
✅ **No mysterious "Builder not found" errors**
✅ **Clear build logs**
✅ **Better free tier documentation**
✅ **Widely used for Python/FastAPI services**

---

## If You Still Want to Use Railway

After Render is working, you can try Railway again with the **nuclear option**:

1. **Delete ALL existing Railway services**
2. **Create completely NEW services** from scratch
3. During creation wizard, set Root Directory BEFORE clicking Deploy
4. Railway should auto-detect Dockerfile on fresh service

But honestly, Render is more reliable for this use case.

---

## Summary Timeline

- **Step 1**: Create Render account (2 min)
- **Step 2**: Deploy transcriber (5-7 min build time)
- **Step 3**: Deploy ingestor (5-7 min build time)
- **Step 4**: Update Vercel environment variables (2 min)
- **Step 5**: Test everything (5 min)

**Total: ~20-25 minutes to fully working deployment**

---

## Next Steps After Successful Deployment

1. ✅ Apply RLS optimization migration in Supabase
2. ✅ Run end-to-end tests
3. ✅ Launch beta!

---

**You're 25 minutes away from a working deployment! 🚀**
