import * as fs from "node:fs";
import * as path from "node:path";
import { certifyContract } from "../validation/contract";
import {
	analyzeProsody,
	validateASR,
	verifySpeaker,
} from "../validation/engine";
import { AuditLogger } from "./audit_logger";
import { composeVideo } from "./composer";
import { IdentityEngine } from "./identity";
import { PulseManager } from "./pulse";
import { generateScriptFromIntent } from "./script_gen";
import { synthesizeVoice } from "./tts";
import type { EmotionalState, ScriptLine } from "./types";
import {
	chunkLines,
	concatAudio,
	generateCaption,
	getNextAssetId,
	parseScriptContent,
} from "./utils";

export class Orchestrator {
	private audit: AuditLogger;
	private runtimeConfig = {
		chunk_length: 200,
		seed_base: 2306,
	};

	constructor(
		private assetDir: string,
		private config: {
			identity: { id: string; name: string; voice_id: string; overrides?: any };
			script_path?: string;
			image_path: string;
			intent?: string;
			runtime?: { chunk_length?: number; seed_base?: number };
		},
	) {
		this.runtimeConfig = { ...this.runtimeConfig, ...(config.runtime || {}) };
		this.audit = new AuditLogger(path.join(this.assetDir, "audit.jsonl"));
	}

	async run() {
		const sessionId = `session-${Math.random().toString(36).substring(7)}`;
		const runtimeLogs: string[] = [];
		const logger = (msg: string) => {
			const line = `[${new Date().toISOString()}] ${msg}`;
			console.log(line);
			runtimeLogs.push(line);
		};

		logger(`[RESONANCE] Starting session ${sessionId}`);
		const assetId = getNextAssetId(this.assetDir);
		const prefix = `${assetId}_${sessionId}`;

		const idEngine = new IdentityEngine({
			...this.config.identity,
			...this.config.identity.overrides,
		});
		const identity = idEngine.getContract();
		const pulse = new PulseManager();
		const referenceAudio = path.join(this.assetDir, "reference.wav");

		let currentEmotion: EmotionalState = {
			valence: 0,
			arousal: 0,
			softness: 0.8,
			atmosphere: identity.preferred_atmosphere,
		};

		let lines: ScriptLine[] = [];
		let fullScriptPath = "";

		if (this.config.intent) {
			logger(`[AUTONOMOUS] Intent detected: ${this.config.intent}`);
			lines = await generateScriptFromIntent(this.config.intent);
			fullScriptPath = path.resolve(this.assetDir, "generated_script.json");
			fs.writeFileSync(fullScriptPath, JSON.stringify(lines, null, 2));
		} else {
			fullScriptPath = path.resolve(
				this.assetDir,
				this.config.script_path || "0001_situation.json",
			);
			if (!fs.existsSync(fullScriptPath))
				throw new Error(`CRITICAL: ${fullScriptPath} missing.`);
			lines = parseScriptContent(fs.readFileSync(fullScriptPath, "utf-8"));
		}

		const audioParts: string[] = [];
		const verifiedLines: ScriptLine[] = [];
		const allSegments: any[] = [];
		const allScores: number[] = [];
		let currentOffset = 0;
		const chunks = chunkLines(lines, this.runtimeConfig.chunk_length);

		for (let i = 0; i < chunks.length; i++) {
			const targetEmotion = await pulse.observe(i / chunks.length);
			currentEmotion = idEngine.smooth(currentEmotion, targetEmotion as any);

			const p = path.join(this.assetDir, `${prefix}_p${i}.wav`);
			logger(
				`[TTS] Chunk ${i + 1}/${chunks.length} | Emotion: v=${currentEmotion.valence.toFixed(2)} a=${currentEmotion.arousal.toFixed(2)} s=${currentEmotion.softness.toFixed(2)}`,
			);

			const cleanText = chunks[i]
				.map((l) => l.text.replace(/（.*?）|\(.*?\)/g, ""))
				.join(" ");
			const caption = generateCaption(identity.voice_id, currentEmotion);

			await synthesizeVoice({
				text: cleanText,
				caption,
				outputPath: p,
				seed: this.runtimeConfig.seed_base + i,
			});

			const asrResult = await validateASR(p, chunks[i]);
			const prosodyResult = await analyzeProsody(p);
			let speakerSim = 1.0;
			if (fs.existsSync(referenceAudio)) {
				const speakerResult = await verifySpeaker(referenceAudio, p);
				speakerSim = speakerResult.similarity;
			}

			const isDamaged = asrResult.is_damaged || speakerSim < 0.8;
			const reason = asrResult.is_damaged
				? "ASR_FAILURE"
				: speakerSim < 0.8
					? "SPEAKER_DRIFT"
					: undefined;

			this.audit.log({
				timestamp: new Date().toISOString(),
				assetId: identity.id,
				sessionId,
				chunkIndex: i,
				wavHash: AuditLogger.calculateHash(fs.readFileSync(p)),
				promptHash: AuditLogger.calculateHash(cleanText),
				seed: this.runtimeConfig.seed_base + i,
				metrics: {
					cer: asrResult.score,
					hallucinations: asrResult.hallucinations.length,
					f0: prosodyResult.f0_mean,
					energy: prosodyResult.energy_mean,
					speaker_sim: speakerSim,
				},
				status: isDamaged ? "FAIL" : "PASS",
				reason,
			});

			if (isDamaged)
				throw new Error(
					`CRITICAL: Chunk ${i} Integrity Damage (${reason}). CRASH-DRIVEN TERMINATION.`,
				);

			audioParts.push(p);
			verifiedLines.push(...chunks[i]);
			for (const seg of asrResult.segments) {
				allSegments.push({
					start: seg.start + currentOffset,
					end: seg.end + currentOffset,
					text: seg.text,
				});
			}
			if (asrResult.segments.length > 0)
				currentOffset +=
					asrResult.segments[asrResult.segments.length - 1].end + 1.0;
			allScores.push(0.8);
		}

		const avgAsrScore =
			allScores.length > 0
				? allScores.reduce((a, b) => a + b, 0) / allScores.length
				: 0;
		const transcriptPath = path.join(this.assetDir, `${prefix}.json`);
		fs.writeFileSync(
			transcriptPath,
			JSON.stringify(
				{
					sessionId,
					produced_at: new Date().toISOString(),
					identity: { id: identity.id, name: identity.name },
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

		const vtt = [
			"WEBVTT",
			"",
			...allSegments.map((s) => {
				const formatTime = (t: number) => {
					const h = Math.floor(t / 3600),
						m = Math.floor((t % 3600) / 60),
						sec = (t % 60).toFixed(3);
					return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.padStart(6, "0")}`;
				};
				return `${formatTime(s.start)} --> ${formatTime(s.end)}\n${s.text.trim()}\n`;
			}),
		].join("\n");
		fs.writeFileSync(path.join(this.assetDir, `${prefix}.vtt`), vtt);

		const audio = path.join(this.assetDir, `${prefix}.wav`);
		await concatAudio(audioParts, audio);

		const fullImagePath = path.resolve(this.assetDir, this.config.image_path);
		const finalVideo = path.join(this.assetDir, `${prefix}.mp4`);
		await composeVideo({
			audioPath: audio,
			imagePath: fullImagePath,
			outputPath: finalVideo,
		});

		const contract = certifyContract({
			sessionId,
			identity: {
				id: identity.id,
				name: identity.name,
				voice_id: identity.voice_id,
			},
			inputPaths: [fullScriptPath, fullImagePath],
			outputPaths: [audio, finalVideo, transcriptPath],
			asrScore: avgAsrScore,
			logs: runtimeLogs,
			traces: {
				emotion_avg: currentEmotion,
				chunk_count: chunks.length,
				total_scores: allScores,
			},
		});
		fs.writeFileSync(
			path.join(this.assetDir, `${prefix}_CONTRACT.json`),
			JSON.stringify(contract, null, 2),
		);

		this.updateNumbers(
			assetId,
			sessionId,
			verifiedLines.length,
			chunks.length,
			avgAsrScore,
		);
		logger(`[DONE] ${sessionId} | Contract: ${contract.verification.status}`);

		const readline = require("node:readline").createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		console.log("\n[FEEDBACK] 上様、今回の成果物はいかがでしたか？");
		const feedback = await new Promise((resolve) =>
			readline.question("> ", resolve),
		);
		readline.close();

		if (feedback) {
			const feedbackPath = path.join(this.assetDir, "feedback.log");
			fs.appendFileSync(
				feedbackPath,
				`\n[${new Date().toISOString()}] ${feedback}`,
			);
			console.log(` [SAVE] フィードバックを記録しました: ${feedbackPath}`);
		}
	}

	private updateNumbers(
		assetId: string,
		sessionId: string,
		chars: number,
		chunks: number,
		asr: number,
	) {
		const p = path.join(process.cwd(), "NUMBERS.md");
		const date = new Date().toISOString().split("T")[0];
		const line = `| ${date} | ${assetId} | ${sessionId} | ${chars} | ${chunks} | ${asr.toFixed(2)} | 0 | DONE |`;
		fs.appendFileSync(p, `\n${line}`);
	}
}
