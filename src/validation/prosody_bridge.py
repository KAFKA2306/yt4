import sys
import json
import librosa
import numpy as np

def main():
    if len(sys.argv) < 2: return
    config = json.loads(sys.argv[1])
    audio_path = config.get("audio_path")

    y, sr = librosa.load(audio_path)
    
    # F0 (Pitch) extraction
    f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
    f0_mean = np.nanmean(f0) if np.any(~np.isnan(f0)) else 0
    f0_std = np.nanstd(f0) if np.any(~np.isnan(f0)) else 0

    # Energy (RMS)
    rms = librosa.feature.rms(y=y)
    energy_mean = np.mean(rms)

    # Silence Detection
    # Non-silent duration vs total duration
    intervals = librosa.effects.split(y, top_db=40)
    non_silent_dur = sum([end - start for start, end in intervals]) / sr
    total_dur = len(y) / sr
    silence_ratio = 1.0 - (non_silent_dur / total_dur) if total_dur > 0 else 1.0

    report = {
        "f0_mean": float(f0_mean),
        "f0_std": float(f0_std),
        "energy_mean": float(energy_mean),
        "silence_ratio": float(silence_ratio),
    }

    print(f"REPORT:{json.dumps(report, ensure_ascii=False)}")
    print(f"DONE")

if __name__ == "__main__":
    main()
