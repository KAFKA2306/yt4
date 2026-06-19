import * as fs from "node:fs";
import * as path from "node:path";
import { certifyContract } from "../validation/contract";
import { validateASR, verifySpeaker } from "../validation/engine";
import { ASR_THRESHOLD } from "../validation/thresholds";
import { AuditLogger } from "./audit_logger";
import { composeVideo } from "./composer";
import { IdentityEngine } from "./identity";
import { Publisher } from "./publisher";
import { PulseManager } from "./pulse";

import { generateScriptFromIntent } from "./script_gen";
import { synthesizeVoice } from "./tts";
import type { EmotionalState, ProductionState, ScriptLine } from "./types";
import {
	chunkLines,
	concatAudio,
	generateCaption,
	parseScriptContent,
} from "./utils";

export class Orchestrator {
	private audit: AuditLogger;
	private publisher: Publisher;
	private runtimeConfig: {
		chunk_length: number;
		seed_base: number;
		temperature: number;
		num_steps: number;
		seconds: number | null;
		duration_scale: number;
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
				seconds?: number | null;
				duration_scale?: number;
				no_ref?: boolean;
				max_retries?: number;
			};
		},
	) {
		const runtimeInput = config.runtime;
		if (!runtimeInput) {
			throw new Error("CRITICAL: runtime config missing in asset config.");
		}
		const requiredKeys: (keyof NonNullable<typeof runtimeInput>)[] = [
			"chunk_length",
			"seed_base",
			"temperature",
			"num_steps",
			"seconds",
			"duration_scale",
			"no_ref",
			"max_retries",
		];
		const missing = requiredKeys.filter(
			(key) => runtimeInput[key] === undefined,
		);
		if (missing.length > 0) {
			throw new Error(
				`CRITICAL: runtime config missing required fields: ${missing.join(", ")}`,
			);
		}
		const runtime = runtimeInput as Required<typeof runtimeInput>;

		this.runtimeConfig = {
			chunk_length: runtime.chunk_length,
			seed_base: runtime.seed_base,
			temperature: runtime.temperature,
			num_steps: runtime.num_steps,
			seconds: runtime.seconds,
			duration_scale: runtime.duration_scale,
			no_ref: runtime.no_ref,
			max_retries: runtime.max_retries,
		};

		this.audit = new AuditLogger(path.join(this.assetDir, "audit.jsonl"));
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
		const assetId = path.basename(this.assetDir).split("_")[0];
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
		const acceptedScores: number[] = [];
		const speakerScores: number[] = [];
		let currentOffset = 0;
		const initialChunks = chunkLines(lines, this.runtimeConfig.chunk_length);
		const workQueue: { lines: ScriptLine[]; attempt: number }[] =
			initialChunks.map((c) => ({ lines: c, attempt: 0 }));

		let chunkCounter = 0;
		while (workQueue.length > 0) {
			const work = workQueue.shift();
			if (!work) break;
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
			const promptText = cleanText;

			const temp = this.runtimeConfig.temperature;
			const seed = this.runtimeConfig.seed_base + chunkCounter + attempt * 100;
			const hasRef = fs.existsSync(referenceAudio);

			logger(`[TTS] Chunk ${chunkCounter} | Attempt ${attempt}`);
			await synthesizeVoice({
				text: cleanText,
				caption: generateCaption(this.config.identity.voice_id, emotion),
				outputPath: p,
				seed,
				temperature: temp,
				num_steps: this.runtimeConfig.num_steps,
				seconds: this.runtimeConfig.seconds,
				no_ref: hasRef ? false : this.runtimeConfig.no_ref,
				duration_scale: this.runtimeConfig.duration_scale,
				refWav: hasRef ? referenceAudio : undefined,
			});

			const asrResult = await validateASR(p, chunk);
			let speakerSim = 1.0;
			let speakerPass = true;
			if (hasRef) {
				const speakerResult = await verifySpeaker(referenceAudio, p);
				speakerSim = speakerResult.similarity;
				speakerPass = speakerResult.is_consistent;
				speakerScores.push(speakerSim);
			}

			const asrPass = !asrResult.is_damaged;
			const status = asrPass && speakerPass ? "PASS" : "FAIL";
			let reason = "NONE";
			if (!asrPass) {
				reason =
					asrResult.failure_type !== "NONE"
						? asrResult.failure_type
						: "ACOUSTIC_DAMAGE";
			} else if (!speakerPass) {
				reason = "SPEAKER_DRIFT";
			}

			this.audit.log({
				timestamp: new Date().toISOString(),
				assetId,
				sessionId,
				chunkIndex: chunkCounter,
				wavHash: AuditLogger.calculateHash(fs.readFileSync(p)),
				promptHash: AuditLogger.calculateHash(promptText),
				seed,
				metrics: {
					cer: asrResult.score,
					hallucinations: 0,
					speaker_sim: speakerSim,
				},
				status,
				reason,
			});

			if (
				(asrResult.is_damaged || !speakerPass) &&
				attempt < this.runtimeConfig.max_retries
			) {
				if (asrResult.is_damaged) {
					logger(` [RETRY] ASR Score too low: ${asrResult.score}`);
				} else {
					logger(
						` [RETRY] Speaker similarity too low: ${speakerSim.toFixed(4)}`,
					);
				}
				workQueue.unshift({ lines: chunk, attempt: attempt + 1 });
				continue;
			}

			audioParts.push(p);
			verifiedLines.push(...chunk);

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

			acceptedScores.push(asrResult.score);
			currentEmotion = emotion;
			chunkCounter++;
		}

		state = "GENERATED";
		const minAsrScore =
			acceptedScores.length > 0 ? Math.min(...acceptedScores) : 0;
		if (acceptedScores.length > 0 && minAsrScore >= ASR_THRESHOLD) {
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

		let remoteProof: any;

		if (state === "VIDEO_RENDERED") {
			state = "REMOTE_UNVERIFIED";

			if (
				process.env.YOUTUBE_PUBLISH_AUTO === "true" &&
				effectiveAsrScore >= ASR_THRESHOLD
			) {
				logger("[PUBLISH] Triggering automatic YouTube publication...");
				state = "UPLOAD_ATTEMPTED";
				const finalVideo = path.join(this.assetDir, `${prefix}.mp4`);
				const receipt = await this.publisher.publish({
					videoPath: finalVideo,
					imagePath: fullImagePath,
					metadata: {
						title: `【ASMR】${identity.name} | ${currentEmotion.atmosphere}`,
						description: `深夜の微細な空気感を、${identity.name}の声と共にお届けします。\n\n#ASMR #深夜`,
						tags: ["ASMR", identity.name],
						visibility: "public",
					},
				});
				state = "UPLOAD_CONFIRMED";
				remoteProof = {
					videoId: receipt.video_id,
					visibility: receipt.privacy_status,
					rawResponse: receipt.raw_response,
				};
				logger(`[PUBLISH] Success: ${receipt.video_id}`);
			}
		}

		const outputPaths = [audio, transcriptPath];
		const finalVideo = path.join(this.assetDir, `${prefix}.mp4`);
		if (fs.existsSync(finalVideo)) {
			outputPaths.push(finalVideo);
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
			speakerScore:
				speakerScores.length > 0 ? Math.min(...speakerScores) : undefined,
			logs: runtimeLogs,
			productionState: state,
			remoteProof,
			traces: {
				emotion_avg: currentEmotion,
				chunk_count: initialChunks.length,
				total_scores: acceptedScores,
				speaker_scores: speakerScores,
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
