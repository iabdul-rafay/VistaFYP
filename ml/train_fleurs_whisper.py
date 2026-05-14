import argparse
import itertools
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Union

# Suppress TensorFlow logging before importing transformers
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Set transformers to use PyTorch-only mode
os.environ["TRANSFORMERS_OFFLINE"] = "0"

# Use a larger cache location on D: to avoid running out of space on C: or E:
HF_CACHE_BASE = os.path.expandvars(r"D:\hf_cache")
os.environ.setdefault("HF_DATASETS_CACHE", os.path.join(HF_CACHE_BASE, "datasets"))
os.environ.setdefault("TRANSFORMERS_CACHE", os.path.join(HF_CACHE_BASE, "transformers"))
os.environ.setdefault("HF_HOME", os.path.join(HF_CACHE_BASE, "huggingface"))
os.environ.setdefault("TMP", os.path.join(HF_CACHE_BASE, "tmp"))
os.environ.setdefault("TEMP", os.path.join(HF_CACHE_BASE, "tmp"))

import evaluate
import torch
from datasets import Audio, Dataset, DatasetDict, concatenate_datasets, load_dataset
from transformers import (
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
    WhisperFeatureExtractor,
    WhisperForConditionalGeneration,
    WhisperProcessor,
    WhisperTokenizer,
)


@dataclass
class DataCollatorSpeechSeq2SeqWithPadding:
    processor: WhisperProcessor

    def __call__(self, features: List[Dict[str, Union[List[int], torch.Tensor]]]) -> Dict[str, torch.Tensor]:
        input_features = [{"input_features": feature["input_features"]} for feature in features]
        batch = self.processor.feature_extractor.pad(input_features, return_tensors="pt")

        label_features = [{"input_ids": feature["labels"]} for feature in features]
        labels_batch = self.processor.tokenizer.pad(label_features, return_tensors="pt")
        labels = labels_batch["input_ids"].masked_fill(labels_batch.attention_mask.ne(1), -100)

        if (labels[:, 0] == self.processor.tokenizer.bos_token_id).all().cpu().item():
            labels = labels[:, 1:]

        batch["labels"] = labels
        return batch


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fine-tune Whisper on FLEURS English + Urdu.")
    parser.add_argument("--model_name", type=str, default="openai/whisper-small")
    parser.add_argument("--output_dir", type=str, default="ml/checkpoints/whisper-fleurs-en-ur")
    parser.add_argument("--max_steps", type=int, default=1200)
    parser.add_argument("--per_device_train_batch_size", type=int, default=8)
    parser.add_argument("--per_device_eval_batch_size", type=int, default=8)
    parser.add_argument("--learning_rate", type=float, default=1e-5)
    parser.add_argument("--warmup_steps", type=int, default=100)
    parser.add_argument("--logging_steps", type=int, default=25)
    parser.add_argument("--eval_steps", type=int, default=200)
    parser.add_argument("--save_steps", type=int, default=200)
    parser.add_argument("--max_train_samples", type=int, default=0, help="0 means use full dataset")
    parser.add_argument("--max_eval_samples", type=int, default=0, help="0 means use full dataset")
    parser.add_argument(
        "--streaming",
        action="store_true",
        help="Use streamed sampling (recommended when disk space is limited).",
    )
    return parser.parse_args()


def _take_streaming(language: str, split: str, limit: int) -> Dataset:
    stream = load_dataset(
        "google/fleurs",
        language,
        split=split,
        streaming=True,
        trust_remote_code=True,
    )
    rows = []
    for item in itertools.islice(stream, limit):
        audio = item.get("audio")
        if isinstance(audio, dict):
            # For tiny streaming runs, keep decoded waveform in-memory to avoid
            # broken relative paths from remote shards on Windows.
            audio_array = audio.get("array")
            if hasattr(audio_array, "tolist"):
                audio_array = audio_array.tolist()
            item["audio"] = {
                "array": audio_array,
                "sampling_rate": audio.get("sampling_rate", 16000),
                "path": None,
            }
        rows.append(item)
    dataset = Dataset.from_list(rows)
    return dataset


def load_bilingual_fleurs(streaming: bool, train_limit: int, eval_limit: int) -> DatasetDict:
    if streaming:
        train_per_lang = max(train_limit // 2, 1) if train_limit > 0 else 500
        eval_per_lang = max(eval_limit // 2, 1) if eval_limit > 0 else 100
        test_per_lang = eval_per_lang

        en_train = _take_streaming("en_us", "train", train_per_lang)
        ur_train = _take_streaming("ur_pk", "train", train_per_lang)
        en_val = _take_streaming("en_us", "validation", eval_per_lang)
        ur_val = _take_streaming("ur_pk", "validation", eval_per_lang)
        en_test = _take_streaming("en_us", "test", test_per_lang)
        ur_test = _take_streaming("ur_pk", "test", test_per_lang)

        train = concatenate_datasets([en_train, ur_train]).shuffle(seed=42)
        validation = concatenate_datasets([en_val, ur_val]).shuffle(seed=42)
        test = concatenate_datasets([en_test, ur_test]).shuffle(seed=42)
        dataset = DatasetDict({"train": train, "validation": validation, "test": test})
        dataset = dataset.cast_column("audio", Audio(sampling_rate=16000))
        return dataset

    en = load_dataset(
        "google/fleurs",
        "en_us",
        trust_remote_code=True,
        cache_dir=os.environ["HF_DATASETS_CACHE"],
    )
    ur = load_dataset(
        "google/fleurs",
        "ur_pk",
        trust_remote_code=True,
        cache_dir=os.environ["HF_DATASETS_CACHE"],
    )

    train = concatenate_datasets([en["train"], ur["train"]]).shuffle(seed=42)
    validation = concatenate_datasets([en["validation"], ur["validation"]]).shuffle(seed=42)
    test = concatenate_datasets([en["test"], ur["test"]]).shuffle(seed=42)

    dataset = DatasetDict({"train": train, "validation": validation, "test": test})
    dataset = dataset.cast_column("audio", Audio(sampling_rate=16000))
    return dataset


def main() -> None:
    args = parse_args()

    print("[INFO] Loading bilingual FLEURS dataset...", flush=True)
    dataset = load_bilingual_fleurs(args.streaming, args.max_train_samples, args.max_eval_samples)
    print(
        f"[INFO] Dataset ready | train={len(dataset['train'])} val={len(dataset['validation'])} test={len(dataset['test'])}",
        flush=True,
    )
    feature_extractor = WhisperFeatureExtractor.from_pretrained(args.model_name)
    tokenizer = WhisperTokenizer.from_pretrained(args.model_name, task="transcribe")
    processor = WhisperProcessor.from_pretrained(args.model_name, task="transcribe")

    def prepare_batch(batch: Dict[str, Any]) -> Dict[str, Any]:
        audio = batch["audio"]
        batch["input_features"] = feature_extractor(
            audio["array"], sampling_rate=audio["sampling_rate"]
        ).input_features[0]
        batch["labels"] = tokenizer(batch["transcription"]).input_ids
        return batch

    remove_cols = dataset["train"].column_names
    print("[INFO] Preprocessing audio features...", flush=True)
    dataset = dataset.map(
        prepare_batch,
        remove_columns=remove_cols,
        num_proc=1,
        keep_in_memory=True,
        load_from_cache_file=False,
    )
    print("[INFO] Preprocessing complete.", flush=True)

    if args.max_train_samples > 0:
        dataset["train"] = dataset["train"].select(range(min(args.max_train_samples, len(dataset["train"]))))
    if args.max_eval_samples > 0:
        dataset["validation"] = dataset["validation"].select(
            range(min(args.max_eval_samples, len(dataset["validation"])))
        )

    model = WhisperForConditionalGeneration.from_pretrained(args.model_name)
    model.generation_config.task = "transcribe"
    model.generation_config.language = None
    model.config.forced_decoder_ids = None
    model.config.suppress_tokens = []

    data_collator = DataCollatorSpeechSeq2SeqWithPadding(processor=processor)
    wer_metric = evaluate.load("wer")

    def compute_metrics(pred):
        pred_ids = pred.predictions
        label_ids = pred.label_ids
        label_ids[label_ids == -100] = tokenizer.pad_token_id

        pred_str = tokenizer.batch_decode(pred_ids, skip_special_tokens=True)
        label_str = tokenizer.batch_decode(label_ids, skip_special_tokens=True)
        wer = 100 * wer_metric.compute(predictions=pred_str, references=label_str)
        return {"wer": wer}

    training_args = Seq2SeqTrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.per_device_train_batch_size,
        per_device_eval_batch_size=args.per_device_eval_batch_size,
        gradient_accumulation_steps=2,
        learning_rate=args.learning_rate,
        warmup_steps=args.warmup_steps,
        max_steps=args.max_steps,
        gradient_checkpointing=True,
        fp16=torch.cuda.is_available(),
        evaluation_strategy="steps",
        save_strategy="steps",
        eval_steps=args.eval_steps,
        save_steps=args.save_steps,
        logging_steps=args.logging_steps,
        predict_with_generate=True,
        generation_max_length=225,
        report_to=[],
        load_best_model_at_end=True,
        metric_for_best_model="wer",
        greater_is_better=False,
    )

    trainer = Seq2SeqTrainer(
        args=training_args,
        model=model,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        data_collator=data_collator,
        tokenizer=processor.feature_extractor,
        compute_metrics=compute_metrics,
    )

    print("[INFO] Starting training...", flush=True)
    trainer.train()
    print("[INFO] Training finished. Saving model...", flush=True)
    trainer.save_model(args.output_dir)
    processor.save_pretrained(args.output_dir)

    print("[INFO] Running test evaluation...", flush=True)
    test_metrics = trainer.evaluate(dataset["test"], metric_key_prefix="test")
    print("Test metrics:", test_metrics)


if __name__ == "__main__":
    main()
