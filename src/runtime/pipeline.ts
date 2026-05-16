import * as fs from "node:fs";
import * as path from "node:path";
import { ASRValidator } from "../validation/asr";
import { QualityJudge } from "../validation/judge";
import { ProsodyValidator } from "../validation/prosody";
import { SpeakerValidator } from "../validation/speaker";
import { AuditLogger } from "./audit_logger";
import { RepairEngine } from "./repair";
import { synthesizeVoice } from "./tts";
import type { AuditTrace, ProductionConfig, ScriptLine } from "./types";
import { chunkLines, generateCaption } from "./utils";

export class OfflinePipeline {
	private asr = new ASRValidator();
	private speaker = new SpeakerValidator();
	private prosody = new ProsodyValidator();
	private judge = new QualityJudge();
	private repair = new RepairEngine();

	constructor(private assetDir: string) {}

	async run(config: ProductionConfig) {
		const sessionId = `batch-${Math.random().toString(36).substring(7)}`;
		const audit = new AuditLogger(path.join(this.assetDir, "audit.jsonl"));
		const scriptPath = path.join(this.assetDir, config.script_path);
		const script: ScriptLine[] = JSON.parse(
			fs.readFileSync(scriptPath, "utf-8"),
		);
		const chunks = chunkLines(script, config.runtime.chunk_length);
		const referenceAudio = path.join(this.assetDir, "reference.wav");

		console.log(`[PIPELINE] Starting Batch Generation: ${config.identity.id}`);

		for (let i = 0; i < chunks.length; i++) {
			let attempt = 0;
			let passed = false;
			const currentChunk = chunks[i];
			let currentOverrides: any = {};

			while (attempt < config.runtime.max_retries && !passed) {
				const p = path.join(
					this.assetDir,
					`${config.identity.id}_${sessionId}_p${i}_v${attempt}.wav`,
				);
				const caption =
					generateCaption(
						config.identity.voice_id,
						currentChunk[0].emotion as any,
					) + (currentOverrides.caption_suffix || "");

				await synthesizeVoice({
					text: currentChunk.map((l) => l.text).join(" "),
					caption,
					outputPath: p,
					seed:
						config.runtime.seed_base + i + (currentOverrides.seed_offset || 0),
					temperature:
						currentOverrides.temperature ?? config.runtime.temperature,
					num_steps: config.runtime.num_steps,
					seconds: config.runtime.seconds,
					no_ref: config.runtime.no_ref,
				});

				const asrResult = await this.asr.validate(p, currentChunk);
				const prosodyResult = await this.prosody.analyze(p);
				const speakerResult = fs.existsSync(referenceAudio)
					? await this.speaker.verify(referenceAudio, p)
					: { similarity: 1.0, is_consistent: true };

				const rawTrace: Partial<AuditTrace> = {
					metrics: {
						cer: asrResult.score,
						hallucinations: asrResult.hallucinations.length,
						f0: prosodyResult.f0_mean,
						energy: prosodyResult.energy_mean,
						speaker_sim: speakerResult.similarity,
						silence_ratio: prosodyResult.silence_ratio,
					},
				};

				const judgment = await this.judge.classify(rawTrace);

				const trace: AuditTrace = {
					timestamp: new Date().toISOString(),
					assetId: config.identity.id,
					sessionId,
					chunkIndex: i,
					wavHash: AuditLogger.calculateHash(fs.readFileSync(p)),
					promptHash: AuditLogger.calculateHash(
						currentChunk.map((l) => l.text).join(" "),
					),
					seed: config.runtime.seed_base + i,
					metrics: rawTrace.metrics as any,
					transcription: asrResult.transcription,
					status: judgment.status,
					fail_types: judgment.fail_types,
					selected_action: judgment.repair_candidate,
					retry_count: attempt,
				};

				audit.log(trace);

				if (judgment.status === "PASS") {
					passed = true;
					console.log(`  [CHUNK ${i}] PASS (Attempt ${attempt})`);
				} else {
					console.log(`  [CHUNK ${i}] FAIL: ${judgment.fail_types.join(", ")}`);
					if (judgment.repair_candidate) {
						const repairResult = this.repair.apply(
							currentChunk,
							judgment.repair_candidate,
							attempt + 1,
						);
						currentOverrides = repairResult.overrides;
						// Handle chunk splitting if needed (recursive or queue-based)
						// For now, just apply overrides to the same chunk
					}
					attempt++;
				}
			}

			if (!passed) {
				throw new Error(
					`CRITICAL: Chunk ${i} failed after ${config.runtime.max_retries} attempts. Pipeline TERMINATED.`,
				);
			}
		}
		console.log(`[PIPELINE] Batch Generation COMPLETE.`);
	}
}
