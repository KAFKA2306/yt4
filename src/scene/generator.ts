import type {
	EmotionalState,
	IdentityContract,
	ScriptLine,
} from "../runtime/types";

export class ASMRScriptGenerator {
	constructor(private identity: IdentityContract) {}

	async generate(
		sceneDescription: string,
		currentEmotion: EmotionalState,
	): Promise<ScriptLine[]> {
		// Implementing Existence Fetish style with short sentences and hesitations
		const lines: ScriptLine[] = [
			{
				text: "……あ。……まだ、起きてたんだ。",
				emotion: currentEmotion,
				pause_after: 3.5,
			},
			{
				text: "外、雨……。……少し、強くなってきたみたい。",
				emotion: { ...currentEmotion, softness: 0.98 },
				pause_after: 4.0,
			},
			{
				text: "（衣擦れの音）……ふふ。……こっち、おいでよ。……大丈夫。……何も、怖いことなんてないから。",
				emotion: { ...currentEmotion, arousal: 0.08 },
				pause_after: 5.5,
			},
			{
				text: "今日の、……空気。……なんだか、すごく……、落ち着く気がする。",
				emotion: currentEmotion,
				pause_after: 4.5,
			},
			{
				text: "……ねぇ。……明日も、……こうして、……いっしょに、いられたらいいね。",
				emotion: { ...currentEmotion, valence: 0.15 },
				pause_after: 6.0,
			},
		];

		return lines;
	}
}
