import { EmotionalStateSchema, type EmotionalState, type IdentityContract } from "../runtime/types";

export class ContinuityEngine {
  constructor(private identity: IdentityContract) {}

  smoothTransition(current: EmotionalState, target: EmotionalState): EmotionalState {
    const maxShift = this.identity.invariants.max_emotion_delta;

    const smooth = (curr: number, tar: number) => {
      const diff = tar - curr;
      if (Math.abs(diff) <= maxShift) return tar;
      return curr + (diff > 0 ? maxShift : -maxShift);
    };

    const next = {
      valence: smooth(current.valence, target.valence),
      arousal: smooth(current.arousal, target.arousal),
      softness: smooth(current.softness, target.softness),
      atmosphere: target.atmosphere,
    };

    // Enforcement of Identity Invariants
    next.arousal = Math.min(next.arousal, this.identity.invariants.max_arousal);
    next.softness = Math.max(next.softness, this.identity.invariants.min_softness);

    return EmotionalStateSchema.parse(next);
  }

  /**
   * Calculates the drift score from the intended identity contract.
   * A higher score means more "drift" from the target atmosphere.
   */
  calculateDrift(state: EmotionalState): number {
    let drift = 0;
    if (state.arousal > this.identity.invariants.max_arousal) {
      drift += (state.arousal - this.identity.invariants.max_arousal);
    }
    if (state.softness < this.identity.invariants.min_softness) {
      drift += (this.identity.invariants.min_softness - state.softness);
    }
    // Atmosphere mismatch also contributes to drift
    if (state.atmosphere !== this.identity.preferred_atmosphere) {
      drift += 0.2;
    }
    return Math.min(drift, 1.0);
  }
}
