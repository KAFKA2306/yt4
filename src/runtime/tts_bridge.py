import os
import sys
import torch
import json
from huggingface_hub import hf_hub_download

# Add Irodori-TTS path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../github/Irodori-TTS")))

from irodori_tts.inference_runtime import InferenceRuntime, RuntimeKey, SamplingRequest, save_wav

def main():
    if len(sys.argv) < 2:
        print("CRITICAL: Config JSON missing.")
        sys.exit(1)
    
    config = json.loads(sys.argv[1])
    
    text = config["text"]
    caption = config["caption"]
    output_path = config["output_path"]
    seed = config["seed"]
    num_steps = config["num_steps"]
    seconds = config.get("seconds") # Can be None
    no_ref = config["no_ref"]
    duration_scale = config.get("duration_scale", 1.0)
    ref_wav = config.get("ref_wav")

    # Use v3 by default, or v2-VoiceDesign if caption is provided and no ref
    repo_id = config.get("repo_id")
    if not repo_id:
        if caption and no_ref:
            repo_id = "Aratako/Irodori-TTS-500M-v2-VoiceDesign"
        else:
            repo_id = "Aratako/Irodori-TTS-500M-v3"

    ckpt = hf_hub_download(repo_id=repo_id, filename="model.safetensors")
    
    runtime = InferenceRuntime.from_key(RuntimeKey(
        checkpoint=ckpt,
        model_device="cuda" if torch.cuda.is_available() else "cpu",
        codec_device="cuda" if torch.cuda.is_available() else "cpu"
    ))

    result = runtime.synthesize(SamplingRequest(
        text=text,
        caption=caption,
        ref_wav=ref_wav,
        seed=seed,
        num_steps=num_steps,
        no_ref=no_ref,
        seconds=seconds,
        duration_scale=duration_scale
    ))
    
    save_wav(output_path, result.audio, result.sample_rate)
    print(f"DONE:{output_path}")

if __name__ == "__main__":
    main()
