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

## Mandatory Production Sequence
The production loop MUST follow this exact order:
0. **Intent (Autonomous Phase)**: If `intent` is specified, trigger Multi-Agent Scripting to generate `generated_script.json`.
1. **JSON**: Load and parse `generated_script.json` or `0001_situation.json`.
2. **WAV**: Synthesize audio chunks via TTS.
3. **Whisper**: Perform ASR transcription and segment analysis.
4. **TTS (Repair)**: Re-synthesize if `ACOUSTIC_DAMAGE` detected (ADR-0026).
5. **Transcript**: Write final metadata to `[prefix].json`.
6. **VTT**: Write WebVTT subtitles with precise Whisper timestamps.
7. **[Gate] Accuracy Verification**: Apply **ADR-0026 Taxonomy** (Whisper Limit vs Acoustic Damage).
8. **Feedback (Feature 2)**: Collect CLI feedback from the user at the end of the run for batch identity refactoring.
9. **WAV (Mix)**: Concatenate verified chunks into the final masterpiece `.wav`.
10. **MP4**: Compose final video into `.mp4`.
11. **UPLOAD**: Publish to YouTube via account-specific credentials (ADR-0027).
12. **PROOF**: Bind `remote_proof` to `UPLOAD.json` and `CONTRACT.json`.

## Production Loop Workflow
1. **Daily Pulse Observation**: Fetch or observe the daily "vibe" and global pulse.
2. **Bias-Free State Initialization**: Initialize emotional state without predefined buckets.
3. **Asset-Driven Config Execution**: Load the target asset directory's `0000_config.json`.
4. **Script Parsing (JSON)**: Read `0001_situation.json`.
5. **Continuous TTS (WAV)**: Perform audio synthesis using Irodori-TTS.
6. **ASR Reverse Validation (Whisper)**: Transcribe generated audio to detect semantic damage.
7. **Damage Detection & Repair (TTS)**: Re-synthesize if `ACOUSTIC_DAMAGE` detected. Permissive pass for `WHISPER_LIMIT` (ADR-0026).
8. **Transcript Generation**: Write final metadata to `[prefix].json`.
9. **VTT Subtitle Generation**: Write subtitles to `[prefix].vtt`.
10. **Accuracy Final Gate**: Confirm zero reading mistakes before final mix.
11. **Final Rendering (MP4)**: Compose final video into `[prefix].mp4`.
12. **Remote Binding**: Execute `task publish` and record `remote_proof` (ADR-0027).

## Identity Invariants
- `max_arousal`: Maximum allowed arousal level to preserve calm atmosphere.
- `min_softness`: Minimum allowed softness to avoid aggressive tones.
- `max_emotion_delta`: Maximum allowed shift in emotional parameters per step.
- `max_pressure_delta`: Maximum allowed shift in room pressure.
- `min_silence_density`: Minimum required silence for atmosphere preservation.

## Irodori-TTS Stability Protocol (ADR-0020)
- **Preferred Model**: Use `Irodori-TTS-500M-v3` (Base) with automatic duration prediction.
- **Reference Parameters**: Set `--ref-normalize-db -16.0` and enable `--ref-ensure-max`.
- **VoiceDesign**: Use `Irodori-TTS-500M-v2-VoiceDesign` with `--caption` for stylistic control (whisper, soft, etc.).
- **Automatic Duration**: v3 models do not require `--seconds`. Use `--duration-scale` for minor adjustments.
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
