import type { ScriptLine } from "./types";

/**
 * 将軍・家老・足軽の合議をシミュレートし、お題（Intent）から脚本を生成する
 */
export async function generateScriptFromIntent(
	intent: string,
): Promise<ScriptLine[]> {
	console.log(`[SHOGUN] お題受領: 「${intent}」`);
	console.log("[KARO] はっ！合議を開始いたします。");

	const themeMatch = intent.match(/^theme:(.+)$/m);
	const explicitTheme = themeMatch?.[1]?.trim();
	const normalized = intent.toLowerCase();
	const theme =
		explicitTheme === "rain" ||
		explicitTheme === "office" ||
		explicitTheme === "morning" ||
		explicitTheme === "ear" ||
		explicitTheme === "maid" ||
		explicitTheme === "study" ||
		explicitTheme === "station" ||
		explicitTheme === "sleep" ||
		explicitTheme === "care" ||
		explicitTheme === "cafe" ||
		explicitTheme === "coding" ||
		explicitTheme === "news" ||
		explicitTheme === "calm"
			? explicitTheme
			: normalized.includes("rain") || normalized.includes("雨")
				? "rain"
				: normalized.includes("office") || normalized.includes("残業")
					? "office"
					: normalized.includes("morning") || normalized.includes("朝")
						? "morning"
						: normalized.includes("ear") || normalized.includes("耳")
							? "ear"
							: normalized.includes("maid") || normalized.includes("メイド")
								? "maid"
								: normalized.includes("study") ||
										normalized.includes("library") ||
										normalized.includes("book")
									? "study"
									: normalized.includes("train") ||
											normalized.includes("station") ||
											normalized.includes("commute")
										? "station"
										: normalized.includes("sleep") ||
												normalized.includes("bed") ||
												normalized.includes("dream")
											? "sleep"
											: normalized.includes("care") ||
													normalized.includes("clean") ||
													normalized.includes("hair")
												? "care"
												: normalized.includes("cafe") ||
														normalized.includes("coffee shop")
													? "cafe"
													: normalized.includes("github") ||
															normalized.includes("code") ||
															normalized.includes("developer") ||
															normalized.includes("repo") ||
															normalized.includes("typescript") ||
															normalized.includes("rust") ||
															normalized.includes("python")
														? "coding"
														: normalized.includes("news") ||
																normalized.includes("launch") ||
																normalized.includes("startup") ||
																normalized.includes("research") ||
																normalized.includes("browser") ||
																normalized.includes("release")
															? "news"
															: "calm";

	const trendMatch = intent.match(/^trend:(.+)$/m);
	const title = (trendMatch?.[1] ?? intent).trim();

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
		study: {
			atmosphere: "quiet-study-room",
			opening: "……机に向かう前に、肩だけ先に下ろしておきましょう。",
			middle:
				"難しいところはあとで戻れるように、ひとつずつ印をつけていきます。",
			close: "……えらいです。今日はここまで進めた分だけ、ちゃんと残っています。",
		},
		station: {
			atmosphere: "late-night-station",
			opening: "……終電の気配がある夜でも、ここでは急がなくて大丈夫です。",
			middle: "改札の音や足音は遠くに置いて、今の呼吸だけを整えましょう。",
			close: "……よし。帰り道の不安は、もう少し静かになりましたね。",
		},
		sleep: {
			atmosphere: "sleepy-night",
			opening: "……眠気が強い夜は、頑張るより先に、力を抜くほうが上手です。",
			middle: "まぶたが重くなるまで、音の隙間を少しずつ柔らかくしていきます。",
			close: "……そのままでいいです。あとは、夢のほうに任せましょう。",
		},
		care: {
			atmosphere: "gentle-care",
			opening: "……今日は、整えることより、先にほどくことを優先しましょう。",
			middle: "手間のかかるところは、私が静かに引き受けます。",
			close: "……大丈夫。もう少し休めば、身体も気持ちも戻ってきます。",
		},
		cafe: {
			atmosphere: "quiet-cafe",
			opening: "……湯気の立つ飲み物が、少しだけ気持ちを落ち着けてくれます。",
			middle: "甘さも苦さも、今日はやさしいほうへ寄せておきますね。",
			close: "……ふふ。ここから先は、静かなカフェ時間にしましょう。",
		},
		coding: {
			atmosphere: "midnight-coding-desk",
			opening:
				"……コードの熱が少し高いですね。まずは肩を落として、目を休めましょう。",
			middle: "画面の前で固まった呼吸をほどいて、ひとつずつ整え直します。",
			close:
				"……よし。今日はここまでで十分です。続きは明日の自分に任せましょう。",
		},
		news: {
			atmosphere: "quiet-newsroom",
			opening:
				"……今日の話題は少し多いですね。必要なところだけを静かに拾っていきましょう。",
			middle:
				"情報の波に流されないように、耳元ではゆっくりした声だけを残します。",
			close: "……大丈夫。ニュースのざわめきは、ここでは少し遠くに置けます。",
		},
		calm: {
			atmosphere: "late-night-calm",
			opening: "……今日は、静かな落ち着きが必要なお題ですね。",
			middle: "急がず、乱さず、やわらかな声で少しずつ整えていきます。",
			close: "……大丈夫。ここから先は、安心して身を預けてください。",
		},
	};

	const scene = scripts[theme];

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
