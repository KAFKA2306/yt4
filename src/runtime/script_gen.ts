import type { ScriptLine } from "./types";

/**
 * 将軍・家老・足軽の合議をシミュレートし、お題（Intent）から脚本を生成する
 */
export async function generateScriptFromIntent(
	intent: string,
): Promise<ScriptLine[]> {
	console.log(`[SHOGUN] お題受領: 「${intent}」`);
	console.log("[KARO] はっ！合議を開始いたします。");

	const normalized = intent.toLowerCase();
	const theme =
		normalized.includes("rain") || normalized.includes("雨")
			? "rain"
			: normalized.includes("office") || normalized.includes("残業")
				? "office"
				: normalized.includes("morning") || normalized.includes("朝")
					? "morning"
					: normalized.includes("ear") || normalized.includes("耳")
						? "ear"
						: normalized.includes("maid") || normalized.includes("メイド")
							? "maid"
							: "calm";

	const scripts: Record<
		string,
		{ atmosphere: string; opening: string; middle: string; close: string }
	> = {
		rain: {
			atmosphere: "late-night-rain",
			opening: "……外の雨音が、部屋の静けさをやさしく包んでいます。",
			middle: "今日は、お題に合わせて、深く落ち着く呼吸にそろえましょう。",
			close: "……大丈夫。雨が強くても、ここではゆっくり休めます。",
		},
		office: {
			atmosphere: "late-night-office",
			opening: "……お仕事、お疲れさまです。まずは肩の力を抜きましょう。",
			middle:
				"書類や通知はいったん脇に置いて、耳に届く声だけを追いかけてください。",
			close: "……よし。今日はここまで。あとは静かな眠気に任せてください。",
		},
		morning: {
			atmosphere: "soft-morning",
			opening: "……おはようございます。少しずつ、朝の光に目を慣らしましょう。",
			middle: "深呼吸をひとつ。今日のお題に合うやさしい始まりを整えます。",
			close: "……いいですね。そのまま、やわらかな一日を始めましょう。",
		},
		ear: {
			atmosphere: "close-whisper",
			opening: "……耳元に、そっと近づきます。緊張しなくて大丈夫ですよ。",
			middle: "お題の輪郭に合わせて、音の距離を細かく整えていきます。",
			close: "……ふふ。近い声も、静かな間も、ちゃんと届いていますか？",
		},
		maid: {
			atmosphere: "late-night-maid-room",
			opening:
				"……失礼いたします。ご主人様のお疲れを、静かにほどいてまいります。",
			middle: "お題に沿って、世話の手順をひとつずつ丁寧に重ねていきます。",
			close: "……はい、これで完了です。どうぞ安心してお休みください。",
		},
		calm: {
			atmosphere: "late-night-calm",
			opening: "……今日は、静かな落ち着きが必要なお題ですね。",
			middle: "急がず、乱さず、やわらかな声で少しずつ整えていきます。",
			close: "……大丈夫。ここから先は、安心して身を預けてください。",
		},
	};

	const scene = scripts[theme];
	const title = intent.trim();

	return [
		{
			text: `……お題は「${title}」。その雰囲気に合わせて進めます。`,
			pause_after: 5,
			emotion: {
				valence: 0.2,
				arousal: 0.1,
				softness: 0.9,
				atmosphere: scene.atmosphere,
			},
		},
		{
			text: scene.opening,
			pause_after: 8,
			emotion: {
				valence: 0.5,
				arousal: 0.1,
				softness: 0.95,
				atmosphere: scene.atmosphere,
			},
		},
		{
			text: scene.middle,
			pause_after: 10,
			emotion: {
				valence: 0.4,
				arousal: 0.05,
				softness: 0.98,
				atmosphere: scene.atmosphere,
			},
		},
		{
			text: scene.close,
			pause_after: 12,
			emotion: {
				valence: 0.35,
				arousal: 0.03,
				softness: 0.99,
				atmosphere: scene.atmosphere,
			},
		},
	];
}
