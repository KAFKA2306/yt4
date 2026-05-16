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
    
    # Mandatory fields - no fallbacks
    text = config["text"]
    caption = config["caption"]
    output_path = config["output_path"]
    seed = config["seed"]
    
    # Optional fields with strict existence check if needed, or mandatory
    num_steps = config["num_steps"]
    seconds = config["seconds"]
    no_ref = config["no_ref"]

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
        num_steps=num_steps,
        no_ref=no_ref,
        seconds=seconds
    ))
    
    save_wav(output_path, result.audio, result.sample_rate)
    print(f"DONE:{output_path}")

if __name__ == "__main__":
    main()
