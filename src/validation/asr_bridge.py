import sys
import json
import torch
import difflib
import re
from faster_whisper import WhisperModel

def clean_text(text):
    # Remove text in parentheses (stage directions)
    text = re.sub(r'\(.*?\)', '', text)
    text = re.sub(r'（.*?）', '', text)
    # Remove symbols and whitespace for core comparison
    text = re.sub(r'[　\s\u3000、。．，\.\,！？!?…]+', '', text)
    return text

def calculate_metrics(expected, actual):
    # Character Error Rate (CER) base
    if not expected: return 0, [], []
    
    matcher = difflib.SequenceMatcher(None, expected, actual)
    cer = matcher.ratio()
    
    # Hallucination & Missing word detection (Char level for Japanese)
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

def main():
    if len(sys.argv) < 2: return
    config = json.loads(sys.argv[1])
    audio_path = config.get("audio_path")
    expected_lines = config.get("expected_lines", [])

    model_size = "small" # Standard for balanced speed/accuracy
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "float32"
    
    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    segments_gen, _ = model.transcribe(audio_path, beam_size=5, language="ja")
    segments = list(segments_gen)
    
    transcribed_text = "".join([segment.text for segment in segments])
    clean_trans = clean_text(transcribed_text)
    full_expected = clean_text("".join(expected_lines))
    
    score, hallucinations, missing = calculate_metrics(full_expected, clean_trans)
    
    print(f"DEBUG: Expected={full_expected[:50]}...")
    print(f"DEBUG: Actual={clean_trans[:50]}...")
        "transcription": transcribed_text,
        "score": score,
        "hallucinations": hallucinations,
        "missing": missing,
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
