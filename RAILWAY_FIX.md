# Railway Services Fix - Transcriber & Ingestor

## Issue
Both Railway services were failing with 502 errors:
```
RuntimeError: Form data requires "python-multipart" to be installed.
```

## Root Cause
FastAPI requires `python-multipart` package to handle file uploads (multipart/form-data), but it was missing from both services' `requirements.txt` files.

## Solution
Added `python-multipart==0.0.9` to:
- `src/transcriber/requirements.txt`
- `src/ingestor/requirements.txt`

## Changes Made

### Transcriber Service
**File:** `src/transcriber/requirements.txt`

```diff
 faster-whisper==1.0.3
 uvicorn==0.30.1
 fastapi==0.115.0
 pydantic==2.8.2
+python-multipart==0.0.9
```

### Ingestor Service
**File:** `src/ingestor/requirements.txt`

```diff
 fastapi==0.115.0
 uvicorn==0.30.1
 python-pptx==0.6.21
 pdfminer.six==20231228
 docx2txt==0.8
 pydantic==2.8.2
+python-multipart==0.0.9
```

## Deployment
Railway auto-deploys on git push to master. The services should automatically rebuild and start working within 2-3 minutes.

## Testing
After deployment, verify services are healthy:

```bash
# Test transcriber
curl https://med-study-transcriber-production.up.railway.app/health

# Test ingestor
curl https://med-study-ingestor-production.up.railway.app/health
```

Expected response: `{"status": "ok"}` or similar (not 502 error)

## Impact
Once deployed, this fixes:
- Material upload functionality (PDF/PPTX processing)
- Audio transcription in lecture mode
- File processing endpoints

## Git Commit
Commit: `cf92c07`
Branch: `master`
Status: Pushed and deploying

---

**Status:** ✅ Fix committed and pushed - Railway auto-deployment in progress
**ETA:** 2-3 minutes for both services to rebuild and redeploy
