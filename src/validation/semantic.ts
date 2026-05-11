import type { EmotionalState, SceneState } from "../runtime/types";

export class SemanticValidator {
	validate(
		text: string,
		emotion: EmotionalState,
		scene: SceneState,
	): { is_valid: boolean; reason?: string } {
		const t = text.toLowerCase();
		if (
			scene.ambience_type === "rain" &&
			!["雨", "rain"].some((k) => t.includes(k))
		)
			return { is_valid: false, reason: "Atmosphere mismatch" };
		if (
			emotion.arousal < 0.3 &&
			["激しい", "急いで"].some((k) => t.includes(k))
		)
			return { is_valid: false, reason: "Arousal mismatch" };
		return { is_valid: true };
	}
}
