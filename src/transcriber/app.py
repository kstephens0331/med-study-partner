from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel
import tempfile, os, subprocess, uuid

app = FastAPI()
MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")

def extract_audio(path: str) -> str:
  out = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}.wav")
  subprocess.run(["ffmpeg","-y","-i",path,"-ac","1","-ar","16000",out],
                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  return out

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
  try:
    fd, tmp = tempfile.mkstemp(suffix=os.path.splitext(file.filename or "")[1])
    with os.fdopen(fd, "wb") as f: f.write(await file.read())
    wav = extract_audio(tmp)
    segments, info = model.transcribe(wav, vad_filter=True)
    s = [{"start": seg.start, "end": seg.end, "text": seg.text.strip()} for seg in segments]
    os.remove(tmp); os.remove(wav)
    return JSONResponse({"ok": True, "language": info.language, "duration": info.duration, "segments": s})
  except Exception as e:
    return JSONResponse({"ok": False, "error": str(e)}, status_code=500)
