import sys
import json
import torch
import difflib
import re
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

def clean_text(text):
    text = re.sub(r'\(.*?\)', '', text)
    text = re.sub(r'（.*?）', '', text)
    text = re.sub(r'[　\s\u3000、。．，\.\,！？!?…]+', '', text)
    return text

def calculate_metrics(expected, actual):
    if not expected: return 0, [], []
    matcher = difflib.SequenceMatcher(None, expected, actual)
    cer = matcher.ratio()
    hallucinated = []
    missing = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'insert':
            hallucinated.append(actual[j1:j2])
        elif tag == 'delete':
            missing.append(expected[i1:i2])
        elif tag == 'replace':
            hallucinated.append(actual[j1:j2])
            missing.append(expected[i1:i2])
    return cer, hallucinated, missing

def analyze_audio(audio_path):
    data, samplerate = sf.read(audio_path)
    rms = np.sqrt(np.mean(data**2))
    return rms

def main():
    if len(sys.argv) < 2: return
    config = json.loads(sys.argv[1])
    audio_path = config.get("audio_path")
    expected_lines = config.get("expected_lines", [])

    model_size = config.get("model_size", "small")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "float32"
    
    rms = analyze_audio(audio_path)
    
    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    segments_gen, _ = model.transcribe(audio_path, beam_size=5, language="ja")
    segments = list(segments_gen)
    
    transcribed_text = "".join([segment.text for segment in segments])
    clean_trans = clean_text(transcribed_text)
    full_expected = clean_text("".join(expected_lines))
    
    score, hallucinations, missing = calculate_metrics(full_expected, clean_trans)
    
    failure_type = "NONE"
    if score < 0.85:
        if rms < 0.01:
            failure_type = "SILENCE_OR_TOO_SOFT"
        elif len(hallucinations) > 5 and score < 0.5:
            failure_type = "ACOUSTIC_DAMAGE"
        else:
            failure_type = "WHISPER_LIMIT" # High speaker_sim expected but Whisper fails

    print(f"DEBUG: Expected={full_expected}")
    print(f"DEBUG: Actual={clean_trans}")
    print(f"DEBUG: RMS={rms:.6f}")
    
    report = {
        "transcription": transcribed_text,
        "score": score,
        "hallucinations": hallucinations,
        "missing": missing,
        "rms": rms,
        "failure_type": failure_type,
        "segments": []
    }
    
    for segment in segments:
        report["segments"].append({
            "start": segment.start,
            "end": segment.end,
            "text": segment.text
        })

    print(f"REPORT:{json.dumps(report, ensure_ascii=False)}")
    print(f"DONE")

if __name__ == "__main__":
    main()
