import sys
import json
import torch
import difflib
from faster_whisper import WhisperModel

def main():
    if len(sys.argv) < 2:
        print("Usage: python asr_bridge.py <json_config>")
        return

    config = json.loads(sys.argv[1])
    audio_path = config.get("audio_path")
    expected_lines = config.get("expected_lines", [])

    model_size = "base"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    model = WhisperModel(model_size, device=device, compute_type="float32")
    segments, info = model.transcribe(audio_path, beam_size=5)
    
    transcribed_text = "".join([segment.text for segment in segments])
    
    report = {
        "transcription": transcribed_text,
        "line_scores": []
    }
    
    # Normalize transcription for comparison
    clean_trans = transcribed_text.replace(" ", "").replace("　", "").replace("。", "").replace("、", "").replace(".", "").replace(",", "")
    
    for line in expected_lines:
        clean_line = line.strip().replace(" ", "").replace("　", "").replace("。", "").replace("、", "").replace(".", "").replace(",", "")
        
        if not clean_line:
            report["line_scores"].append({"line": line, "score": 1.0})
            continue
            
        matcher = difflib.SequenceMatcher(None, clean_line, clean_trans)
        match = matcher.find_longest_match(0, len(clean_line), 0, len(clean_trans))
        score = match.size / len(clean_line)
        
        report["line_scores"].append({
            "line": line,
            "score": score
        })

    print(f"REPORT:{json.dumps(report, ensure_ascii=False)}")
    print(f"DONE")

if __name__ == "__main__":
    main()
