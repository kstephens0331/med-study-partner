# Railway Branch Configuration Fix

## Problem Identified

Railway can't find `src/transcriber` because it's deploying from the wrong branch!

**Current situation:**
- Railway is deploying from: `af/stage/1758917636806` branch
- Latest fixes are on: `master` branch
- The `railway.json` files only exist on `master`

## Solution

You have 2 options:

### Option 1: Change Railway to Deploy from Master (Recommended)

**Steps:**
1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select your **transcriber** service
3. Go to **Settings** tab
4. Find **Source** section
5. Look for **Branch** setting
6. Change from `af/stage/1758917636806` to `master`
7. Set **Root Directory** to: `src/transcriber`
8. Click **Save**
9. Repeat for **ingestor** service with root: `src/ingestor`

**Why this is better:**
- `master` has all the latest fixes
- All future updates will deploy automatically
- Cleaner branch structure

---

### Option 2: Merge Master into af/stage Branch

If you need to keep using the `af/stage` branch:

```bash
cd "c:\Users\usmc3\OneDrive\Documents\Stephens Code Programs\Med-study-planner\med-study-partner"

# Checkout the af/stage branch
git checkout af/stage/1758917636806

# Merge master into it
git merge master

# Push the changes
git push origin af/stage/1758917636806
```

Then Railway will auto-deploy with the new files.

---

## Verification

After changing the branch in Railway:

1. **Check Railway Build Logs**
   - Should show: "Building Docker image"
   - Should NOT show: "npm ci"

2. **Test Health Endpoint**
   ```bash
   curl https://med-study-transcriber-production.up.railway.app/health
   ```
   - Should return: `{"status": "ok"}`

---

## Why This Happened

The `af/stage/` branch was created earlier in development. When we added the Railway fixes today, we committed them to `master` branch. Railway was still configured to deploy from the old branch.

---

## Recommended Configuration

After fixing, your Railway settings should be:

**Transcriber Service:**
- Repository: `kstephens0331/med-study-partner`
- Branch: `master`
- Root Directory: `src/transcriber`
- Builder: DOCKERFILE (auto-detected from railway.json)

**Ingestor Service:**
- Repository: `kstephens0331/med-study-partner`
- Branch: `master`
- Root Directory: `src/ingestor`
- Builder: DOCKERFILE (auto-detected from railway.json)

---

## Quick Start (Just Do This)

1. Railway Dashboard → Transcriber Service → Settings
2. Change **Branch** to `master`
3. Set **Root Directory** to `src/transcriber`
4. Save
5. Repeat for Ingestor with root `src/ingestor`
6. Wait 5 minutes for rebuild
7. Test: `curl https://.../health`
8. ✅ Done!

**ETA:** 10 minutes total
