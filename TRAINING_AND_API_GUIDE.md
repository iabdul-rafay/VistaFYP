# VISTA Whisper Model Training & API Setup Guide

## Overview
This guide walks you through:
1. **Training** the fine-tuned Whisper model on English + Urdu
2. **Building** a FastAPI server to serve predictions
3. **Integrating** the API with your React Native app

---

## Phase 1: Environment Setup

### Step 1: Install Python 3.11
1. Download from: https://www.python.org/downloads/
2. **Important**: Check "Add Python to PATH" during installation
3. Verify installation:
   ```powershell
   python --version
   python -m pip --version
   ```

### Step 2: Create Virtual Environment (Recommended)
```powershell
cd "e:\VISTA FYP\Vista\VISTA main\ml"
python -m venv venv
.\venv\Scripts\Activate.ps1
```

---

## Phase 2: Model Training

### Step 1: Install Dependencies
```powershell
cd "e:\VISTA FYP\Vista\VISTA main\ml"
pip install -r requirements.txt
```

### Step 2: Run Training
Training takes **2-4 hours on CPU**, or **30-45 minutes on GPU**.

**Option A: Quick Test (recommended first)**
```powershell
python train_fleurs_whisper.py --streaming --max_steps 200 --max_train_samples 500 --max_eval_samples 100
```

**Option B: Full Training**
```powershell
python train_fleurs_whisper.py --streaming --max_steps 1200
```

**Option C: Custom Parameters**
```powershell
python train_fleurs_whisper.py `
  --model_name openai/whisper-small `
  --output_dir ml/checkpoints/whisper-fleurs-en-ur `
  --max_steps 1200 `
  --per_device_train_batch_size 8 `
  --learning_rate 1e-5 `
  --streaming
```

### Expected Output
```
[INFO] Loading bilingual FLEURS dataset...
[INFO] Dataset ready | train=2000 val=400 test=400
[INFO] Preprocessing audio features...
[INFO] Starting training...
Epoch 1/1:   0%|          | 0/1200 [00:00<?, ?it/s]
...
[INFO] Training finished. Saving model...
[INFO] Running test evaluation...
Test metrics: {'test_wer': 15.2, ...}
```

Model is saved to: `ml/checkpoints/whisper-fleurs-en-ur/`

---

## Phase 3: API Server Setup

### Step 1: Install API Dependencies
```powershell
pip install -r requirements-api.txt
```

### Step 2: Start the API Server
```powershell
python api_server.py
```

Expected output:
```
[INFO] Loading trained model from ml/checkpoints/whisper-fleurs-en-ur
[INFO] Using device: cpu
[INFO] Model loaded successfully!
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Press CTRL+C to stop the server
```

### Step 3: Test the API
**In a new terminal/PowerShell**:

```powershell
# Check health
curl http://localhost:8000/health

# Transcribe audio (replace with your audio file)
$file = Get-Item "path/to/audio.wav"
$form = @{
    file = $file
}
Invoke-WebRequest -Uri "http://localhost:8000/transcribe" `
    -Method Post `
    -Form @{file = $file}
```

Or use the **interactive docs**: http://localhost:8000/docs

---

## Phase 4: Integration with React Native App

### Option 1: Call Local API (Development)
Update [hooks/useVoiceControl.ts](../../hooks/useVoiceControl.ts):

```typescript
// Use local API instead of OpenAI
const LOCAL_API_URL = "http://192.168.x.x:8000"; // Your machine's IP

const transcribeAudio = async (audioUri: string): Promise<string> => {
  const formData = new FormData();
  
  // Load audio file
  const response = await fetch(audioUri);
  const blob = await response.blob();
  formData.append("file", blob, "audio.wav");
  
  // Call API
  const result = await fetch(`${LOCAL_API_URL}/transcribe`, {
    method: "POST",
    body: formData,
  });
  
  const data = await result.json();
  return data.text;
};
```

### Option 2: Call Remote API (Production)
Deploy the API to a cloud provider and update `LOCAL_API_URL` to your API endpoint.

---

## Troubleshooting

### "Python not found"
- Verify Python was added to PATH (restart terminal after install)
- Try: `python --version`

### "Out of memory during training"
- Reduce batch size: `--per_device_train_batch_size 4`
- Use streaming mode: `--streaming`
- Reduce samples: `--max_train_samples 500`

### "CUDA out of memory"
- Enable gradient checkpointing (already enabled in script)
- Reduce batch size
- Use CPU instead

### Model not loading in API
- Ensure training completed successfully
- Check `ml/checkpoints/whisper-fleurs-en-ur/` contains `config.json`, `pytorch_model.bin`, etc.
- Check model files aren't corrupted

### "Permission denied" when running scripts
```powershell
# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## API Endpoints

### GET `/health`
Health check.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cpu",
  "model_source": "local"
}
```

### POST `/transcribe`
Transcribe audio file.

**Parameters:**
- `file` (required): Audio file (WAV, MP3, M4A, OGG, FLAC)
- `language` (optional): "en" or "ur"

**Response:**
```json
{
  "text": "turn on the light",
  "language": "en",
  "model_source": "local",
  "device": "cpu"
}
```

### GET `/`
API info.

---

## Performance Benchmarks

| Device | Model Size | Inference Time | Training Time |
|--------|-----------|-----------------|---------------|
| CPU (i7) | whisper-small | 2-3s | 2-4 hours |
| GPU (RTX 3060) | whisper-small | 0.3s | 30-45 min |
| CPU (i5) | whisper-base | 5-10s | 6-8 hours |

---

## Files Created

- `ml/api_server.py` - FastAPI server
- `ml/api_client.py` - Python client for API
- `ml/requirements-api.txt` - API dependencies
- `ml/checkpoints/whisper-fleurs-en-ur/` - Trained model (after training)

---

## Next Steps

1. ✅ Install Python
2. ▶️ Run model training
3. ▶️ Start API server
4. ▶️ Test with local API
5. ▶️ Deploy to cloud for production

For questions, check the API docs at `http://localhost:8000/docs`
