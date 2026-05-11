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
    # Remove symbols and whitespace
    text = re.sub(r'[　\s\u3000、。．，\.\,！？!?…]+', '', text)
    return text

def main():
    if len(sys.argv) < 2: return
    config = json.loads(sys.argv[1])
    audio_path = config.get("audio_path")
    expected_lines = config.get("expected_lines", [])

    model_size = "base"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Use float32 on CPU to avoid warnings, float16/int8 on GPU
    compute_type = "float16" if device == "cuda" else "float32"
    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    segments, _ = model.transcribe(audio_path, beam_size=5)
    
    transcribed_text = "".join([segment.text for segment in segments])
    clean_trans = clean_text(transcribed_text)
    
    report = {"transcription": transcribed_text, "line_scores": []}
    
    for line in expected_lines:
        clean_line = clean_text(line)
        if not clean_line:
            report["line_scores"].append({"line": line, "score": 1.0})
            continue
            
        score = difflib.SequenceMatcher(None, clean_line, clean_trans).ratio()
        report["line_scores"].append({"line": line, "score": score})

    print(f"REPORT:{json.dumps(report, ensure_ascii=False)}")
    print(f"DONE")

if __name__ == "__main__":
    main()
