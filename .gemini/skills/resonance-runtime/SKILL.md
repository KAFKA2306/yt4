---
name: resonance-runtime
description: Core autonomous emotional media production logic for the yt4 project. Handles emotional continuity, identity invariants, Irodori-TTS stability, and the Existence Fetish style guide for ASMR production. Use when generating scripts, synthesising audio, or validating emotional atmospheric integrity.
---

# Resonance Runtime Skill

## Objective
Execute the autonomous emotional media production loop for yt4 while preserving identity invariants and emotional continuity. The system maintains a persistent emotional identity and semantic fidelity across long-running voice sessions, specifically preserving the "録音されてしまった深夜" atmosphere for Yawa Archive ASMR.

## Core Runtime Layers
1. **runtime**: Orchestrate the production loop and manage global state.
2. **continuity**: Smooth emotional transitions and prevent atmospheric drift.
3. **identity**: Enforce identity invariants (max_arousal, min_softness, etc.).
4. **validation**: Ensure semantic fidelity and audio integrity via ASR.
5. **scene**: Maintain atmosphere persistence (late-night, rain, room-tone).

## Production Loop Workflow
1. **Daily Pulse Observation**: Fetch or observe the daily "vibe" and global pulse.
2. **Bias-Free State Initialization**: Initialize emotional state without predefined buckets.
3. **Asset-Driven Config Execution**: Load the target asset directory's `config.json` to define identity, script path, and image path.
4. **Script Parsing**: Read `0001_situation.json` (flat Zero-Fat array `[{ "text": "...", "pause": 5 }]`) as the source of truth.
5. **Continuity Smoothing**: Use the ContinuityEngine to prevent abrupt shifts.
6. **Semantic Validation**: Verify text aligns with the scene atmosphere.
7. **Continuous TTS**: Perform single-pass audio synthesis using Irodori-TTS.
   - **Stability Protocol (ADR-0020)**: Use `Irodori-TTS-500M-v2` with 10-30s reference audio.
8. **ASR Reverse Validation**: Transcribe generated audio to detect semantic damage.
9. **Damage Detection**: Check for critical mismatches or audio artifacts.
10. **Repair Loop**: Re-synthesize or fix if damage exceeds thresholds.
11. **Final Rendering**: Compose audio and visual assets into the final MP4 within the same asset directory (Never Nest).

## Identity Invariants
- `max_arousal`: Maximum allowed arousal level to preserve calm atmosphere.
- `min_softness`: Minimum allowed softness to avoid aggressive tones.
- `max_emotion_delta`: Maximum allowed shift in emotional parameters per step.
- `max_pressure_delta`: Maximum allowed shift in room pressure.
- `min_silence_density`: Minimum required silence for atmosphere preservation.

## Irodori-TTS Stability Protocol (ADR-0020)
- **Preferred Model**: Use `Irodori-TTS-500M-v2` (Base) with high-quality reference audio (10-30s).
- **Reference Parameters**: Set `--max-ref-seconds 30.0`, `--ref-normalize-db -16.0`, and enable `--ref-ensure-max`.
- **VoiceDesign**: Use `Irodori-TTS-500M-v2-VoiceDesign` only for one-off characters or specific aesthetic tuning.
- **Persistent Characters**: Prioritize LoRA fine-tuning for recurring personas (e.g., Kafka).
- **Stability Control**: Use a fixed `seed` across reruns to ensure deterministic output.

## Yawa Archive Rules
- **Preservation**: Preserve "録音されてしまった深夜" across all production stages.
- **Never Nest / Simplify**: Maintain a flat structure in asset directories. Do not create subdirectories.
- **Zero-Fat Scripts**: Use `0001_situation.json` with a flat array of lines. Eliminate unnecessary meta fields.
- **ASR QA**: Treat ASR as a mandatory semantic integrity check, not a polish step.
- **Atmosphere Lock**: Maintain the "深夜" (late-night) vibe as a global constant.
- **Video Integration**: Ensure `final_video.mp4` is generated in the asset directory. Do not stop at `final_mix.wav`.

## Existence Fetish Style Guide
- **Short Sentences**: Prioritize brevity and natural pauses.
- **Hesitations**: Include "..." and fillers to mimic human speech.
- **Softness**: Ensure the vocabulary is gentle and non-confrontational.
- **Observational Loneliness**: Focus on the quiet presence of being alone together.

## Critical Constraints
- **Zero-Fat**: Remove all unused code, comments, and boilerplate.
- **Crash-Driven**: Fail fast on critical damage; no try-catch in business logic.
- **Strict English**: Maintain this file in English to maximize trigger rates.
- **Local-First**: Prioritize SQLite and local files over cloud dependencies.
- **Management by Numbers**: Record every run's metrics in NUMBERS.md.

## Terminal Commands
- `task run`: Execute the full production pipeline (e.g., `bun index.ts 009_tsundere_kafka_maid`).
- `task validate:audio`: Perform standalone ASR validation.
- `task lint`: Ensure zero-fat and code quality standards.

---
*End of Resonance Skill Definition*
