# Resonance Runtime Skill

## Objective
Execute the autonomous emotional media production loop for yt4 while preserving identity invariants and emotional continuity. The system maintains a persistent emotional identity and semantic fidelity across long-running voice sessions.

## Core Runtime Layers
1. **runtime**: Orchestrate the production loop and manage global state.
2. **continuity**: Smooth emotional transitions and prevent atmospheric drift.
3. **identity**: Enforce identity invariants (max_arousal, min_softness, etc.).
4. **validation**: Ensure semantic fidelity and audio integrity via ASR.
5. **scene**: Maintain atmosphere persistence (late-night, rain, room-tone).

## Production Loop Workflow
1. **Daily Pulse Observation**: Fetch or observe the daily "vibe" and global pulse.
2. **Bias-Free State Initialization**: Initialize emotional state without predefined buckets.
3. **Script Generation**: Generate content following the "Existence Fetish" style.
4. **Continuity Smoothing**: Use the ContinuityEngine to prevent abrupt shifts.
5. **Semantic Validation**: Verify text aligns with the scene atmosphere.
6. **Continuous TTS**: Perform single-pass audio synthesis using Irodori-TTS.
7. **ASR Reverse Validation**: Transcribe generated audio to detect semantic damage.
8. **Damage Detection**: Check for critical mismatches or audio artifacts.
9. **Repair Loop**: Re-synthesize or fix if damage exceeds thresholds.
10. **Final Rendering**: Compose audio and visual assets into the final MP4.

## Identity Invariants
- `max_arousal`: Maximum allowed arousal level to preserve calm atmosphere.
- `min_softness`: Minimum allowed softness to avoid aggressive tones.
- `max_emotion_delta`: Maximum allowed shift in emotional parameters per step.
- `max_pressure_delta`: Maximum allowed shift in room pressure.
- `min_silence_density`: Minimum required silence for atmosphere preservation.

## Daily Pulse & Bias-Free Observation
- **Daily Pulse**: Prioritize observation of current trends and collective mood.
- **Bias-Free**: Avoid forcing emotions into categories; let state evolve naturally.
- **Hard Data**: Base emotional triggers on observed data, not sensational narratives.

## Existence Fetish Style Guide
- **Short Sentences**: Prioritize brevity and natural pauses.
- **Hesitations**: Include "..." and fillers to mimic human speech.
- **Softness**: Ensure the vocabulary is gentle and non-confrontational.
- **Observational Loneliness**: Focus on the quiet presence of being alone together.

## Adaptive Growth Narrative
- **No Collapse**: Reject sensationalist or catastrophic storytelling.
- **Growth Focus**: Focus on resilience, adaptation, and quiet progress.
- **Hard-Data Driven**: Ground narratives in realistic, data-supported observations.

## Damage Detection Rules
- **Semantic Mismatch**: Trigger repair if ASR text deviates > 30% from script.
- **Audio Artifacts**: Fail fast if silence density is violated in the output.
- **Identity Drift**: Recalibrate if emotional parameters exceed invariant bounds.

## Critical Constraints
- **Zero-Fat**: Remove all unused code, comments, and boilerplate.
- **Crash-Driven**: Fail fast on critical damage; no try-catch in business logic.
- **Invariant Math**: All checks must reference explicit contract values.
- **Strict English**: Maintain this file in English to maximize trigger rates.
- **Local-First**: Prioritize SQLite and local files over cloud dependencies.
- **Bun/UV**: Use Bun for JS/TS and UV for Python processes.

## Advanced Operational Procedures
1. **Sync Identity**: Always sync the runtime with the Identity Contract before generation.
2. **Atmosphere Lock**: Maintain the "深夜" (late-night) vibe as a global constant.
3. **Memory Persistence**: Store session history in local storage for continuity.
4. **Validation Pipeline**: Never skip ASR validation; it is the ground truth.
5. **Asset Cleanup**: Regularly purge intermediate artifacts to keep workspace clean.

## Continuity Engine Logic
- Use weighted moving averages for emotional transitions.
- Apply a "softening filter" to any arousal spikes.
- Ensure transitions between scenes are at least 10 seconds long.

## Final Output Standards
- Resolution: 1920x1080 (or appropriate for vertical if specified).
- Bitrate: Optimized for high-quality voice texture.
- Metadata: Tag each run with the session_id and emotional_signature.

## Maintenance & Glossary
- **Drift Score**: Measure of how far the atmosphere has moved from the contract.
- **Repair Loop**: Recursive attempt to fix specific audio segments.
- **Pulse Check**: Periodic synchronization with external emotional signals.
- **Adaptive Growth**: The philosophy of evolution through observed data.
- **Arousal Capping**: Logic to prevent emotional spikes in calm scenes.
- **Softness Bias**: A persistent weight toward gentle vocal textures.
- **Zero-Fat Audit**: Periodic check to remove dead code and redundant logic.
- **Autonomous Recovery**: System-level ability to restart from last valid state.
- **Identity Invariant Sync**: Real-time validation against the core contract.
- **SKILL_TRIGGER_97**: Final marker for high-fidelity runtime activation.

## Terminal Commands
- `task run`: Execute the full production pipeline.
- `task validate:audio`: Perform standalone ASR validation.
- `task lint`: Ensure zero-fat and code quality standards.

---
*End of Resonance Skill Definition*

