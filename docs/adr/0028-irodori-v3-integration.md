# ADR-0028: Irodori-TTS v3 Integration and Duration Predictor Enforcement

## Status
Accepted

## Context
yt4 project relies heavily on high-fidelity ASMR audio generation. Previously, Irodori-TTS v2 enforced a fixed duration (typically 30s) or required manual duration estimation, leading to:
1. Inefficient inference for short sentences.
2. Silent padding or hallucinations in long-tail regions.
3. Lack of deterministic pacing control without manual intervention.

The release of Irodori-TTS v3 introduces a Duration Predictor and variable-length synthesis.

## Decision
We transition the Resonance Runtime to support Irodori-TTS v3 features as the primary synthesis engine.

1. **Duration Predictor by Default**: Set `seconds: null` in the global and asset configurations to trigger the v3 Duration Predictor.
2. **Variable Length Synthesis**: Allow the engine to generate exactly the required amount of audio based on text features.
3. **Pacing Control via Duration Scale**: Introduce `duration_scale` to allow the orchestrator to adjust the generated length (e.g., 1.2 for slower speech) without fixed time constraints.
4. **Hybrid Model Routing**: 
   - Use `v3` for standard reference-based synthesis.
   - Use `v2-VoiceDesign` for caption-based synthesis until a v3-VoiceDesign model is released.

## Consequences
- **Improved Performance**: Faster inference by generating only necessary frames.
- **Natural Pacing**: Text-aware duration prediction improves emotional realism.
- **Complexity**: `tts_bridge.py` must handle dynamic model selection and optional duration fields.
- **Watermarking**: Integration of SilentCipher watermarking as part of the v3 pipeline.
