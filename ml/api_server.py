"""
FastAPI server to serve the fine-tuned Whisper model.

Endpoints:
  POST /transcribe - Transcribe audio file
  GET /health - Health check
"""

import os
import tempfile
from pathlib import Path
from typing import Optional

import torch
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
from transformers import WhisperForConditionalGeneration, WhisperProcessor
from pydantic import BaseModel
import uvicorn

# ============================================================================
# Configuration
# ============================================================================
MODEL_DIR = Path(__file__).parent / "checkpoints" / "whisper-fleurs-en-ur"
DEFAULT_MODEL = "openai/whisper-small"  # Fallback if training not done

# Check if trained model exists, otherwise use base model
if MODEL_DIR.exists() and any(MODEL_DIR.iterdir()):
    MODEL_PATH = str(MODEL_DIR)
    MODEL_SOURCE = "local"
    print(f"[INFO] Loading trained model from {MODEL_PATH}")
else:
    MODEL_PATH = DEFAULT_MODEL
    MODEL_SOURCE = "huggingface"
    print(f"[WARNING] Trained model not found. Using base model: {DEFAULT_MODEL}")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[INFO] Using device: {DEVICE}")

# ============================================================================
# Initialize FastAPI
# ============================================================================
app = FastAPI(
    title="VISTA Whisper API",
    description="Fine-tuned Whisper model for English & Urdu speech recognition",
    version="1.0.0",
)

# Global models (loaded once at startup)
processor = None
model = None


def load_model():
    """Load processor and model."""
    global processor, model
    
    try:
        print("[INFO] Loading processor...")
        processor = WhisperProcessor.from_pretrained(MODEL_PATH)
        
        print("[INFO] Loading model...")
        model = WhisperForConditionalGeneration.from_pretrained(MODEL_PATH)
        model = model.to(DEVICE)
        model.eval()
        
        print("[INFO] Model loaded successfully!")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}")
        return False


@app.on_event("startup")
async def startup_event():
    """Load model on server startup."""
    success = load_model()
    if not success:
        raise RuntimeError("Failed to initialize model on startup")


# ============================================================================
# Request/Response Models
# ============================================================================
class TranscriptionResponse(BaseModel):
    text: str
    language: Optional[str] = None
    confidence: Optional[float] = None
    model_source: str
    device: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    model_source: str


# ============================================================================
# Endpoints
# ============================================================================
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API health and model status."""
    return HealthResponse(
        status="healthy" if model is not None else "unhealthy",
        model_loaded=model is not None,
        device=DEVICE,
        model_source=MODEL_SOURCE,
    )


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Query(None, description="'en' for English, 'ur' for Urdu"),
):
    """
    Transcribe audio file using fine-tuned Whisper model.
    
    Args:
        file: Audio file (WAV, MP3, etc.)
        language: Optional language code
    
    Returns:
        Transcription text and metadata
    """
    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    allowed_extensions = {".wav", ".mp3", ".m4a", ".ogg", ".flac"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Load and process audio
        print(f"[INFO] Processing audio: {file.filename}")
        
        # Use librosa to load audio
        import librosa
        audio, sr = librosa.load(tmp_path, sr=16000, mono=True)
        
        # Process with Whisper
        input_features = processor(
            audio,
            sampling_rate=sr,
            return_tensors="pt"
        ).input_features.to(DEVICE)
        
        # Generate transcription
        with torch.no_grad():
            predicted_ids = model.generate(input_features)
        
        transcription = processor.batch_decode(
            predicted_ids,
            skip_special_tokens=True
        )[0]
        
        # Cleanup
        os.unlink(tmp_path)
        
        print(f"[INFO] Transcription: {transcription}")
        
        return TranscriptionResponse(
            text=transcription,
            language=language or "auto-detected",
            model_source=MODEL_SOURCE,
            device=DEVICE,
        )
    
    except Exception as e:
        # Cleanup on error
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        
        print(f"[ERROR] Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "VISTA Whisper API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "transcribe": "/transcribe",
            "docs": "/docs",
        },
        "model_source": MODEL_SOURCE,
        "device": DEVICE,
    }


# ============================================================================
# Main
# ============================================================================
if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
