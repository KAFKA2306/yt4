import * as fs from "node:fs";
import * as path from "node:path";
import { AuditLogger } from "../runtime/audit_logger";
import { OfflinePipeline } from "../runtime/pipeline";
import type {
	AuditTrace,
	ProductionConfig,
	ScriptLine,
} from "../runtime/types";
import { ASRValidator } from "./asr";
import { QualityJudge } from "./judge";
import { ProsodyValidator } from "./prosody";
import { SpeakerValidator } from "./speaker";

async function main() {
	const assetDirName = process.argv[2];
	const generateMode = process.argv.includes("--generate");

	if (!assetDirName) {
		console.error(
			"Usage: bun src/validation/harness_cli.ts <asset_dir_name> [--generate]",
		);
		process.exit(1);
	}

	const assetDir = path.resolve(process.cwd(), "assets", assetDirName);
	const configPath = path.join(assetDir, "0000_config.json");
	const config: ProductionConfig = JSON.parse(
		fs.readFileSync(configPath, "utf-8"),
	);
	const scriptPath = path.join(assetDir, config.script_path);
	const script: ScriptLine[] = JSON.parse(fs.readFileSync(scriptPath, "utf-8"));

	if (generateMode) {
		const pipeline = new OfflinePipeline(assetDir);
		await pipeline.run(config);
		console.log("[HARNESS] Generation completed. Proceeding to final audit...");
	}

	const asr = new ASRValidator();
	const speaker = new SpeakerValidator();
	const prosody = new ProsodyValidator();
	const judge = new QualityJudge();
	const audit = new AuditLogger(path.join(assetDir, "audit.jsonl"));

	console.log(`[HARNESS] Auditing asset: ${assetDirName}`);

	const files = fs
		.readdirSync(assetDir)
		.filter((f) => f.endsWith(".wav") && f.includes("_p"));
	if (files.length === 0) {
		console.error(
			"No audio files found. Run with --generate to produce audio.",
		);
		process.exit(1);
	}
	const chunkFiles = new Map<number, string>();
	for (const f of files) {
		const match = f.match(/_p(\d+)_/);
		if (match) {
			const idx = parseInt(match[1]);
			const vMatch = f.match(/_v(\d+)/);
			const version = vMatch ? parseInt(vMatch[1]) : 0;
			if (!chunkFiles.has(idx)) {
				chunkFiles.set(idx, f);
			} else {
				const existing = chunkFiles.get(idx)!;
				const eV = existing.match(/_v(\d+)/)
					? parseInt(existing.match(/_v(\d+)/)![1])
					: 0;
				if (version > eV) chunkFiles.set(idx, f);
			}
		}
	}

	const firstChunk = chunkFiles.get(0);
	if (!firstChunk)
		throw new Error("CRITICAL: First chunk missing for reference.");
	const referenceAudio = path.join(assetDir, firstChunk);
	let failCount = 0;

	for (let i = 0; i < script.length; i++) {
		const wavFile = chunkFiles.get(i);
		if (!wavFile) continue;

		const p = path.join(assetDir, wavFile);
		console.log(`[AUDIT] Chunk ${i}: ${wavFile}`);

		const asrResult = await asr.validate(p, [script[i]]);
		const prosodyResult = await prosody.analyze(p);
		const speakerResult = await speaker.verify(referenceAudio, p);

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

		const judgment = await judge.classify(rawTrace);

		const trace: AuditTrace = {
			timestamp: new Date().toISOString(),
			assetId: config.identity.id,
			sessionId: wavFile.split("_")[1],
			chunkIndex: i,
			wavHash: AuditLogger.calculateHash(fs.readFileSync(p)),
			promptHash: AuditLogger.calculateHash(script[i].text),
			seed: 0,
			metrics: rawTrace.metrics as any,
			transcription: asrResult.transcription,
			status: judgment.status,
			fail_types: judgment.fail_types,
			selected_action: judgment.repair_candidate,
			retry_count: 0,
		};

		if (trace.status === "FAIL") failCount++;

		audit.log(trace);
		console.log(
			`  -> ${trace.status} | FAILs: ${trace.fail_types?.join(", ") || "None"} | Repair: ${trace.selected_action || "None"}`,
		);
	}

	console.log(
		`\n[RESULT] Audit Complete. FAIL: ${failCount} / ${script.length}`,
	);
	if (failCount > 0) process.exit(1);
}

main();
