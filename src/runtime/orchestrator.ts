import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "yaml";
import { certifyContract } from "../validation/contract";
import {
	analyzeProsody,
	validateASR,
	verifySpeaker,
} from "../validation/engine";
import { AuditLogger } from "./audit_logger";
import { composeVideo } from "./composer";
import { IdentityEngine } from \"./identity\";
import { PulseManager } from \"./pulse\";
import { Publisher } from \"./publisher\";
import { type FailureReason, RepairEngine } from \"./repair\";
import { generateScriptFromIntent } from "./script_gen";
import { synthesizeVoice } from "./tts";
import type { EmotionalState, ProductionState, ScriptLine } from "./types";
import {
	chunkLines,
	concatAudio,
	generateCaption,
	getNextAssetId,
	parseScriptContent,
} from "./utils";

export class Orchestrator {
	private audit: AuditLogger;
	private repair: RepairEngine;
	private publisher: Publisher;
	private runtimeConfig: {
		chunk_length: number;
		seed_base: number;
		temperature: number;
		num_steps: number;
		seconds: number;
		no_ref: boolean;
		max_retries: number;
	};

	constructor(
		private assetDir: string,
		private config: {
			identity: { id: string; name: string; voice_id: string; overrides?: any };
			script_path?: string;
			image_path: string;
			intent?: string;
			runtime?: {
				chunk_length?: number;
				seed_base?: number;
				temperature?: number;
				num_steps?: number;
				seconds?: number;
				no_ref?: boolean;
				max_retries?: number;
			};
		},
	) {
		const defaultConfig = yaml.parse(
			fs.readFileSync(path.join(process.cwd(), "config/default.yaml"), "utf-8"),
		);

		this.runtimeConfig = {
			chunk_length:
				config.runtime?.chunk_length ?? defaultConfig.runtime.chunk_length,
			seed_base: config.runtime?.seed_base ?? defaultConfig.runtime.seed_base,
			temperature:
				config.runtime?.temperature ?? defaultConfig.runtime.temperature,
			num_steps: config.runtime?.num_steps ?? defaultConfig.runtime.num_steps,
			seconds: config.runtime?.seconds ?? defaultConfig.runtime.seconds,
			no_ref: config.runtime?.no_ref ?? defaultConfig.runtime.no_ref,
			max_retries: config.runtime?.max_retries ?? 3,
		};

		this.audit = new AuditLogger(path.join(this.assetDir, "audit.jsonl"));
		this.repair = new RepairEngine();
		this.publisher = new Publisher(this.assetDir);
	}

	async run() {
		const sessionId = `session-${Math.random().toString(36).substring(7)}`;
		const runtimeLogs: string[] = [];
		const logger = (msg: string) => {
			const line = `[${new Date().toISOString()}] ${msg}`;
			console.log(line);
			runtimeLogs.push(line);
		};

		let state: ProductionState = "IDLE";
		logger(`[RESONANCE] Starting session ${sessionId}`);
		state = "GENERATING";
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
			if (!this.config.script_path)
				throw new Error("CRITICAL: script_path missing in configuration.");
			fullScriptPath = path.resolve(this.assetDir, this.config.script_path);
			if (!fs.existsSync(fullScriptPath))
				throw new Error(`CRITICAL: ${fullScriptPath} missing.`);
			lines = parseScriptContent(fs.readFileSync(fullScriptPath, "utf-8"));
		}

		const audioParts: string[] = [];
		const verifiedLines: ScriptLine[] = [];
		const allSegments: any[] = [];
		const allScores: number[] = [];
		let currentOffset = 0;
		const initialChunks = chunkLines(lines, this.runtimeConfig.chunk_length);
		const workQueue: { lines: ScriptLine[]; attempt: number }[] =
			initialChunks.map((c) => ({ lines: c, attempt: 0 }));

		let chunkCounter = 0;
		while (workQueue.length > 0) {
			const work = workQueue.shift()!;
			const chunk = work.lines;
			const attempt = work.attempt;

			const targetEmotion = await pulse.observe(
				chunkCounter / initialChunks.length,
			);
			const emotion = idEngine.smooth(currentEmotion, targetEmotion as any);

			const p = path.join(this.assetDir, `${prefix}_p${chunkCounter}.wav`);
			const cleanText = chunk
				.map((l) => l.text.replace(/（.*?）|\(.*?\)/g, ""))
				.join(" ");

			let temp = this.runtimeConfig.temperature;
			const seed = this.runtimeConfig.seed_base + chunkCounter + attempt * 100;

			if (attempt > 0) {
				const repairResult = this.repair.apply(
					chunk,
					"ACOUSTIC_DAMAGE",
					attempt,
				);
				if (repairResult.overrides.temperature)
					temp = repairResult.overrides.temperature;
				if (repairResult.overrides.softness_delta)
					emotion.softness = Math.max(
						0.1,
						emotion.softness + repairResult.overrides.softness_delta,
					);
			}

			const caption = generateCaption(identity.voice_id, emotion);
			logger(
				`[TTS] Chunk ${chunkCounter + 1} | Emotion: s=${emotion.softness.toFixed(2)} | Attempt: ${attempt}`,
			);

			await synthesizeVoice({
				text: cleanText,
				caption,
				outputPath: p,
				seed,
				temperature: temp,
				num_steps: this.runtimeConfig.num_steps,
				seconds: this.runtimeConfig.seconds,
				no_ref: this.runtimeConfig.no_ref,
			});

			const asrResult = await validateASR(p, chunk);
			const prosodyResult = await analyzeProsody(p);
			let speakerSim = 1.0;
			if (fs.existsSync(referenceAudio)) {
				const speakerResult = await verifySpeaker(referenceAudio, p);
				speakerSim = speakerResult.similarity;
			}

			// F0 Clamping: Physically impossible pitch for a whisper
			const isDistorted =
				prosodyResult.f0_mean > 500 || prosodyResult.f0_mean < 50;
			const isDamaged =
				asrResult.is_damaged || speakerSim < 0.75 || isDistorted;
			let reason: FailureReason = asrResult.failure_type as FailureReason;
			if (speakerSim < 0.75) reason = "SPEAKER_DRIFT";
			if (isDistorted) reason = "ACOUSTIC_DAMAGE"; // Digital distortion/Chipmunk

			const status = isDamaged ? "FAIL" : "PASS";

			this.audit.log({
				timestamp: new Date().toISOString(),
				assetId: identity.id,
				sessionId,
				chunkIndex: chunkCounter,
				wavHash: AuditLogger.calculateHash(fs.readFileSync(p)),
				promptHash: AuditLogger.calculateHash(cleanText),
				seed,
				metrics: {
					cer: asrResult.score,
					hallucinations: asrResult.hallucinations.length,
					f0: prosodyResult.f0_mean,
					energy: prosodyResult.energy_mean,
					speaker_sim: speakerSim,
					rms: asrResult.rms,
				},
				status,
				reason,
			});

			if (isDamaged) {
				if (attempt < this.runtimeConfig.max_retries) {
					logger(
						`[RETRY] Chunk ${chunkCounter} failed: ${reason} (F0=${prosodyResult.f0_mean.toFixed(1)}). Retrying...`,
					);
					const repairPlan = this.repair.apply(chunk, reason, attempt + 1);
					if (repairPlan.modifiedChunks.length > 1) {
						const nextWork = repairPlan.modifiedChunks.map((c) => ({
							lines: c,
							attempt: attempt + 1,
						}));
						workQueue.unshift(...nextWork);
					} else {
						workQueue.unshift({ lines: chunk, attempt: attempt + 1 });
					}
					continue;
				}
				logger(`[CRITICAL] Chunk ${chunkCounter} failed after max retries.`);
				this.updateNumbers(
					assetId,
					sessionId,
					verifiedLines.length,
					initialChunks.length,
					allScores.length > 0 ? Math.min(...allScores) : 0,
					"LOCAL_FAIL",
				);
				throw new Error(`CRITICAL: Integrity Damage (${reason}).`);
			}

			if (asrResult.failure_type === "WHISPER_LIMIT") {
				logger(
					`[WARNING] Chunk ${chunkCounter} ASR struggle (Whisper Limit). Identity maintained.`,
				);
			}

			audioParts.push(p);
			verifiedLines.push(...chunk);

			// TRUTH-DRIVEN CAPTIONS: Use script text, not hallucinated transcription
			if (asrResult.segments.length > 0) {
				const chunkText = chunk.map((l) => l.text).join("");
				allSegments.push({
					start: currentOffset,
					end:
						currentOffset +
						asrResult.segments[asrResult.segments.length - 1].end,
					text: chunkText,
				});
				currentOffset +=
					asrResult.segments[asrResult.segments.length - 1].end + 1.0;
			} else {
				const estimatedDuration =
					chunk.reduce((s, l) => s + l.text.length, 0) * 0.15;
				allSegments.push({
					start: currentOffset,
					end: currentOffset + estimatedDuration,
					text: chunk.map((l) => l.text).join(""),
				});
				currentOffset += estimatedDuration + 1.0;
			}

			allScores.push(asrResult.score);
			currentEmotion = emotion;
			chunkCounter++;
		}
		state = "GENERATED";
		const minAsrScore = allScores.length > 0 ? Math.min(...allScores) : 0;
		if (minAsrScore >= 0.99) {
			state = "AUDIO_VALIDATED";
		} else {
			state = "LOCAL_FAIL";
		}

		const effectiveAsrScore = minAsrScore;
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
					transcription: "[TRUTH-DRIVEN] Subtitles generated from script.",
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
		if (state === "AUDIO_VALIDATED") {
			const finalVideo = path.join(this.assetDir, `${prefix}.mp4`);
			await composeVideo({
				audioPath: audio,
				imagePath: fullImagePath,
				outputPath: finalVideo,
			});
			state = "VIDEO_RENDERED";
		}

		// Strictly separate remote reality
		const finalState = state;
		if (finalState === "VIDEO_RENDERED") {
			state = "REMOTE_UNVERIFIED";
		}

		const outputPaths = [audio, transcriptPath];
		if (state === "REMOTE_UNVERIFIED" || state.startsWith("UPLOAD")) {
			outputPaths.push(path.join(this.assetDir, `${prefix}.mp4`));
		}

		const contract = certifyContract({
			sessionId,
			identity: {
				id: identity.id,
				name: identity.name,
				voice_id: identity.voice_id,
			},
			inputPaths: [fullScriptPath, fullImagePath],
			outputPaths,
			asrScore: effectiveAsrScore,
			logs: runtimeLogs,
			productionState: state,
			traces: {
				emotion_avg: currentEmotion,
				chunk_count: initialChunks.length,
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
			initialChunks.length,
			effectiveAsrScore,
			state,
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
		state: ProductionState,
	) {
		const p = path.join(process.cwd(), "NUMBERS.md");
		const date = new Date().toISOString().split("T")[0];
		const line = `| ${date} | ${assetId} | ${sessionId} | ${chars} | ${chunks} | ${asr.toFixed(2)} | 0 | ${state} |`;
		fs.appendFileSync(p, `\n${line}`);
	}
}
