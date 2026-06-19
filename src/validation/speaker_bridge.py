import sys
import json
import torch
import librosa
from speechbrain.inference.speaker import EncoderClassifier

def main():
    if len(sys.argv) < 2: return
    config = json.loads(sys.argv[1])
    source_path = config.get("source_path")
    target_path = config.get("target_path")
    threshold = float(config["threshold"])

    # Use ECAPA-TDNN for speaker verification
    classifier = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        run_opts={"device": "cuda" if torch.cuda.is_available() else "cpu"}
    )

    def get_embedding(path):
        signal, fs = librosa.load(path, sr=16000)
        # Convert to torch tensor
        signal_tensor = torch.from_numpy(signal).unsqueeze(0)
        return classifier.encode_batch(signal_tensor)

    emb1 = get_embedding(source_path).flatten()
    emb2 = get_embedding(target_path).flatten()

    # Cosine Similarity
    similarity = torch.nn.functional.cosine_similarity(emb1.unsqueeze(0), emb2.unsqueeze(0)).item()

    report = {
        "similarity": similarity,
        "status": "PASS" if similarity > threshold else "FAIL"
    }

    print(f"REPORT:{json.dumps(report, ensure_ascii=False)}")
    print(f"DONE")

if __name__ == "__main__":
    main()
