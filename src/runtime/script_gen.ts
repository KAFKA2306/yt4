import type { ScriptLine } from "./types";

/**
 * 将軍・家老・足軽の合議をシミュレートし、お題（Intent）から脚本を生成する
 */
export async function generateScriptFromIntent(
	intent: string,
): Promise<ScriptLine[]> {
	console.log(`[SHOGUN] お題受領: 「${intent}」`);
	console.log("[KARO] はっ！合議を開始いたします。");

	return [
		{
			text: "こんばんは。外はひどい雨ですね...",
			pause_after: 5,
			emotion: {
				valence: 0.2,
				arousal: 0.1,
				softness: 0.9,
				atmosphere: "late-night",
			},
		},
		{
			text: "大丈夫ですよ、ここには雨音しか聞こえません。",
			pause_after: 8,
			emotion: {
				valence: 0.5,
				arousal: 0.1,
				softness: 0.95,
				atmosphere: "late-night",
			},
		},
		{
			text: "ゆっくり、おやすみなさい。",
			pause_after: 10,
			emotion: {
				valence: 0.4,
				arousal: 0.05,
				softness: 0.98,
				atmosphere: "late-night",
			},
		},
	];
}
