import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { ASRValidator } from "../validation/asr";
import { VideoComposer } from "./composer";
import { IdentityEngine } from "./identity";
import { PulseManager } from "./pulse";
import type { AssetStore } from "./storage";
import { IrodoriTtsEngine } from "./tts";
import type { EmotionalState, ScriptLine } from "./types";

export class Orchestrator {
	constructor(
		private store: AssetStore,
		private assetDir: string,
		private config: {
			identity: {
				id: string;
				name: string;
				voice_id: string;
				overrides?: any;
			};
			script_path: string;
			image_path: string;
			runtime: {
				chunk_length: number;
				seed_base: number;
				pause_min: number;
				pause_max: number;
				max_retries: number;
				asr_threshold: number;
			};
		},
	) {}

	async run() {
		const sessionId = `session-${Math.random().toString(36).substring(7)}`;
		const assetId = this.getNextAssetId();
		const prefix = `${assetId}_${sessionId}`;

		const baseIdentity = {
			...this.config.identity,
			voice_id: this.config.identity.voice_id,
			...this.config.identity.overrides,
		};
		const idEngine = new IdentityEngine(baseIdentity);
		const identity = idEngine.getContract();
		const tts = new IrodoriTtsEngine();
		const asr = new ASRValidator();
		const pulse = new PulseManager();

		let currentEmotion: EmotionalState = {
			valence: 0,
			arousal: 0,
			softness: 0.8,
			atmosphere: identity.preferred_atmosphere,
		};

		const fullScriptPath = path.resolve(this.assetDir, this.config.script_path);
		console.log(`[RESONANCE] Loading script from ${fullScriptPath}...`);
		if (!fs.existsSync(fullScriptPath)) {
			throw new Error(`CRITICAL: ${fullScriptPath} missing.`);
		}

		const rawScript = fs.readFileSync(fullScriptPath, "utf-8");
		const lines = this.parseScriptContent(rawScript);

		const audioParts: string[] = [];
		const verifiedLines: ScriptLine[] = [];
		const allSegments: any[] = [];
		let currentOffset = 0;
		const chunks = this.chunkLines(lines, this.config.runtime.chunk_length);

		for (let i = 0; i < chunks.length; i++) {
			const progress = i / chunks.length;
			const targetEmotion = await pulse.observe(progress);
			currentEmotion = idEngine.smooth(currentEmotion, targetEmotion as any);

			let pth = "";
			let segments: any[] = [];
			const maxRetries = this.config.runtime.max_retries;
			for (let v = 1; v <= maxRetries; v++) {
				const p = this.store.getPath(`${prefix}_p${i}_v${v}.wav`);
				console.log(
					`[TTS] Chunk ${i + 1}/${chunks.length} (v${v}) | Emotion: v=${currentEmotion.valence.toFixed(2)} a=${currentEmotion.arousal.toFixed(2)} s=${currentEmotion.softness.toFixed(2)}`,
				);

				const cleanText = chunks[i]
					.map((l) => l.text.replace(/（.*?）|\(.*?\)/g, ""))
					.join(" ");

				const dynamicCaption = this.generateCaption(
					identity.voice_id,
					currentEmotion,
				);

				await tts.synthesize({
					text: cleanText,
					caption: dynamicCaption,
					outputPath: p,
					seed: this.config.runtime.seed_base + i + v,
				});

				const report = await asr.validate(
					p,
					chunks[i],
					this.config.runtime.asr_threshold,
				);
				if (!report.is_damaged) {
					pth = p;
					segments = report.segments;
					break;
				}
			}
			if (!pth)
				throw new Error(`Chunk ${i} Failure: Atmospheric Integrity Damage`);

			audioParts.push(pth);
			verifiedLines.push(...chunks[i]);

			for (const seg of segments) {
				allSegments.push({
					start: seg.start + currentOffset,
					end: seg.end + currentOffset,
					text: seg.text,
				});
			}

			if (segments.length > 0) {
				currentOffset += segments[segments.length - 1].end + 1.0;
			}
		}

		// Final Transcript Generation
		fs.writeFileSync(
			this.store.getPath(`${prefix}.json`),
			JSON.stringify(
				{
					sessionId,
					produced_at: new Date().toISOString(),
					identity: {
						id: identity.id,
						name: identity.name,
					},
					stats: {
						total_chars: verifiedLines.reduce((s, l) => s + l.text.length, 0),
					},
					script: verifiedLines.map((l) => ({
						text: l.text,
						pause: l.pause_after,
					})),
					transcription: allSegments.map((s) => s.text.trim()).join(" "),
					segments: allSegments.map((s) => ({
						start: s.start,
						end: s.end,
						text: s.text.trim(),
					})),
				},
				null,
				2,
			),
		);

		// VTT Generation
		const vtt = [
			"WEBVTT",
			"",
			...allSegments.map((s) => {
				const formatTime = (t: number) => {
					const h = Math.floor(t / 3600);
					const m = Math.floor((t % 3600) / 60);
					const sec = (t % 60).toFixed(3);
					return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.padStart(6, "0")}`;
				};
				return `${formatTime(s.start)} --> ${formatTime(s.end)}\n${s.text.trim()}\n`;
			}),
		].join("\n");
		fs.writeFileSync(this.store.getPath(`${prefix}.vtt`), vtt);

		const audio = this.store.getPath(`${prefix}.wav`);
		await this.concat(audioParts, audio);

		const fullImagePath = path.resolve(this.assetDir, this.config.image_path);
		await new VideoComposer().compose({
			audioPath: audio,
			imagePath: fullImagePath,
			outputPath: this.store.getPath(`${prefix}.mp4`),
		});

		console.log(`[DONE] ${sessionId}`);
	}

	private generateCaption(baseVoice: string, emotion: EmotionalState): string {
		const softness =
			emotion.softness > 0.95
				? "極限まで優しく、消え入りそうなほど繊細な囁き声。"
				: "非常に落ち着いた、安心感のある囁き声。";
		const emotionDesc =
			emotion.valence > 0.4
				? "幸福感に満ちた、慈愛を感じさせるトーン。"
				: "切なさと静かな情熱が混ざり合った、深い夜の情緒。";
		return `${baseVoice} ${softness} ${emotionDesc}`;
	}

	private getNextAssetId(): string {
		const outDir = this.assetDir;
		const files = fs.readdirSync(outDir);
		const max = files
			.map((f) => Number.parseInt(f.split("_")[0], 10))
			.filter((n) => !Number.isNaN(n))
			.reduce((a, b) => Math.max(a, b), 0);
		return (max + 1).toString().padStart(4, "0");
	}

	private parseScriptContent(raw: string): ScriptLine[] {
		const json = JSON.parse(raw);
		if (!Array.isArray(json)) {
			throw new Error("Script must be a JSON array of lines.");
		}
		return json.map((l: any) => {
			if (typeof l.text !== "string") {
				throw new Error(`Invalid line format: ${JSON.stringify(l)}`);
			}
			return {
				text: l.text,
				pause_after: l.pause,
				emotion: l.emotion,
			};
		});
	}

	private chunkLines(ls: ScriptLine[], t: number) {
		const res: ScriptLine[][] = [];
		let cur: ScriptLine[] = [];
		let c = 0;
		for (const l of ls) {
			cur.push(l);
			c += l.text.length;
			if (c >= t) {
				res.push(cur);
				cur = [];
				c = 0;
			}
		}
		if (cur.length > 0) res.push(cur);
		return res;
	}

	private async concat(ps: string[], out: string) {
		const f = this.store.getPath("ps.txt");
		fs.writeFileSync(f, ps.map((p) => `file '${path.resolve(p)}'`).join("\n"));
		return new Promise<void>((res, rej) => {
			const p = spawn("ffmpeg", [
				"-y",
				"-f",
				"concat",
				"-safe",
				"0",
				"-i",
				f,
				"-c",
				"copy",
				out,
			]);
			p.on("close", (c) => (c === 0 ? res() : rej(c)));
		});
	}
}
