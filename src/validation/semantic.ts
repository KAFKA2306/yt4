import { type EmotionalState, type SceneState } from "../runtime/types";

export interface SemanticValidationResult {
  is_valid: boolean;
  score: number; // 0 to 1
  reason?: string;
}

export class SemanticValidator {
  private calmKeywords = ["ゆっくり", "おやすみ", "静か", "落ち着く", "リラックス"];
  private intenseKeywords = ["ドキドキ", "激しい", "急いで", "危ない"];

  validate(text: string, emotion: EmotionalState, scene: SceneState): SemanticValidationResult {
    const textLower = text.toLowerCase();
    const scores: number[] = [];
    const reasons: string[] = [];

    // 1. Atmosphere Consistency
    if (scene.ambience_type === "rain") {
      const rainKeywords = ["雨", "ぽつぽつ", "しとしと", "濡れる", "rain"];
      const hasRainTerm = rainKeywords.some(k => textLower.includes(k));
      if (!hasRainTerm) {
        scores.push(0.6);
        reasons.push("Atmosphere mismatch: Rain expected in script.");
      }
    }

    // 2. Emotional Alignment (Arousal)
    if (emotion.arousal < 0.3) {
      const hasIntenseTerm = this.intenseKeywords.some(k => textLower.includes(k));
      if (hasIntenseTerm) {
        scores.push(0.5);
        reasons.push("Emotional mismatch: High-arousal terms in low-arousal state.");
      }
    } else if (emotion.arousal > 0.7) {
      const hasCalmTerm = this.calmKeywords.some(k => textLower.includes(k));
      if (hasCalmTerm) {
        scores.push(0.6);
        reasons.push("Emotional mismatch: Too calm for high-arousal state.");
      }
    }

    // 3. Softness Check
    if (emotion.softness > 0.8) {
      const harshTerms = ["ダメ", "嫌い", "うるさい", "どいて"];
      if (harshTerms.some(k => textLower.includes(k))) {
        scores.push(0.4);
        reasons.push("Emotional mismatch: Harsh terms in high-softness state.");
      }
    }

    if (scores.length === 0) {
      return { is_valid: true, score: 0.98 };
    }

    const minScore = Math.min(...scores);
    return {
      is_valid: minScore > 0.5,
      score: minScore,
      reason: reasons.join(" | ")
    };
  }
}
