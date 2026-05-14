# FLEURS Whisper Training (English + Urdu)

This project can be trained on the Google FLEURS dataset for bilingual ASR.

Dataset link: [google/fleurs](https://huggingface.co/datasets/google/fleurs)

## 1) Create Python environment

```bash
cd "e:\VISTA FYP\Vista\VISTA main"
python -m venv .venv-ml
.venv-ml\Scripts\activate
pip install -r ml/requirements.txt
```

## 2) Run a quick smoke train

This confirms the pipeline works on a small subset:

```bash
python ml/train_fleurs_whisper.py --max_steps 50 --max_train_samples 500 --max_eval_samples 100
```

## 3) Full bilingual training

```bash
python ml/train_fleurs_whisper.py --model_name openai/whisper-small --max_steps 1200
```

## 4) Where model is saved

Checkpoints and final model are stored in:

`ml/checkpoints/whisper-fleurs-en-ur`

## 5) How to use with your app

- Keep your app using OpenAI Whisper API for production simplicity, OR
- Host your fine-tuned model on a backend endpoint and call that endpoint from the app.

Direct on-device Whisper fine-tuning/inference is not practical for Expo mobile.
