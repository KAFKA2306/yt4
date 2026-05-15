# ADR-0025: Lifestyle Triple-based Character Memory

## Status
Proposed

## Context
The "yt4" Resonance Runtime requires a grounding mechanism to ensure identity coherence. The user (Kafka) has provided a high-volume lifestyle log in triple format (subject, predicate, object). 

## Decision
1. **Triple-based Storage**: Store lifestyle observations as JSONL triples in `data/lifelog/triples.jsonl`.
2. **Local-first Management**: Implement `LifeLogManager` in `src/domain/lifelog.ts` to provide query capabilities.
3. **Bias-Free Observation**: Integrate `LifeLogManager` into `PulseManager` to allow the "Daily Pulse" to be grounded in factual observations rather than static templates.
4. **Resonance Invariant**: Use life log data to verify if generated content (e.g., ASMR scripts) violates known character facts.

## Consequences
- **Positive**: Increased character depth and emotional continuity.
- **Negative**: Increased complexity in the observation layer.
- **Strict Requirement**: No `try-catch` in the manager. Use Zod for validation.
