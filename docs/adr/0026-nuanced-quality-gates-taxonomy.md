# ADR-0026: Nuanced Quality Gates and Failure Taxonomy

## Status
Accepted

## Context
Initial implementation of ADR-0024 used a binary "Pass/Fail" logic for ASR (Automatic Speech Recognition), where any CER (Character Error Rate) below a strict threshold resulted in a critical crash.
However, ASMR content often involves extreme whispers and breathy delivery which Whisper and other ASR models struggle to transcribe accurately, even when the human-perceived quality is high.
Strict adherence to ASR thresholds was causing the production of high-quality ASMR to be erroneously discarded, while also failing to distinguish between technical model collapse (hallucinations/artifacts) and simply quiet/breathy audio.

## Decision
We implement a nuanced quality gate system based on a failure taxonomy and deterministic repair actions.

1.  **Failure Taxonomy**: Categorize verification failures into specific types:
    *   `WHISPER_LIMIT`: Low ASR score but high Speaker Similarity and valid Prosody. Indicates valid ASMR that ASR cannot read.
    *   `ACOUSTIC_DAMAGE`: High hallucination rate or fragmented segments. Indicates model collapse.
    *   `SILENCE_OR_TOO_SOFT`: Low RMS power. Indicates a failure to generate audible speech.
    *   `SPEAKER_DRIFT`: Low similarity to reference embedding.
2.  **Permissive Gates**: Allow `WHISPER_LIMIT` failures to pass if other metrics (Speaker Similarity, Prosody) are healthy.
3.  **Deterministic Repair Engine**: Instead of immediate termination, the system applies specific parameter shifts based on the failure type:
    *   `ACOUSTIC_DAMAGE` -> Lower temperature, split chunk.
    *   `SILENCE` -> Reduce softness (breathiness).
    *   `SPEAKER_DRIFT` -> New seed, refresh reference embedding.
4.  **Acoustic Analysis**: Integrate RMS power calculation into the ASR bridge to differentiate between "bad audio" and "quiet audio".

## Consequences
*   **Improved Yield**: High-quality whispers are no longer discarded by strict ASR gates.
*   **Resilience**: The system can autonomously recover from model glitches via the Repair Engine.
*   **Audit Clarity**: Audit logs now contain specific reasons for failure and repair history, improving observability.
*   **ASMR Authenticity**: Maintains the artistic integrity of breathy delivery while ensuring technical validity.
