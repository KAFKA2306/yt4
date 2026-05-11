import os
import sys
import torch
import json
from huggingface_hub import hf_hub_download

# Add Irodori-TTS path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../github/Irodori-TTS")))

from irodori_tts.inference_runtime import InferenceRuntime, RuntimeKey, SamplingRequest, save_wav

def main():
    if len(sys.argv) < 2: return
    config = json.loads(sys.argv[1])
    text = config.get("text", "")
    caption = config.get("caption", "静かで知的な若い女性の声。少し疲れた深夜の距離感。")
    output_path = config.get("output_path", "output.wav")
    seed = config.get("seed", 2306)

    ckpt = hf_hub_download(repo_id="Aratako/Irodori-TTS-500M-v2-VoiceDesign", filename="model.safetensors")
    
    runtime = InferenceRuntime.from_key(RuntimeKey(
        checkpoint=ckpt,
        model_device="cuda" if torch.cuda.is_available() else "cpu",
        codec_device="cuda" if torch.cuda.is_available() else "cpu"
    ))

    result = runtime.synthesize(SamplingRequest(
        text=text,
        caption=caption,
        seed=seed,
        num_steps=24, # Quality improvement
        no_ref=True,
        seconds=45.0 # Support longer chunks
    ))
    
    save_wav(output_path, result.audio, result.sample_rate)
    print(f"DONE:{output_path}")

if __name__ == "__main__":
    main()
