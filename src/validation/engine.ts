import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "yaml";
import type { ScriptLine } from "../runtime/types";

const defaultConfig = yaml.parse(
	fs.readFileSync(path.join(process.cwd(), "config/default.yaml"), "utf-8"),
);

export async function validateASR(
	audioPath: string,
	script: ScriptLine[],
	threshold = defaultConfig.validation.asr_threshold,
) {
	const bridge = path.join(process.cwd(), "src/validation/asr_bridge.py");
	const config = JSON.stringify({
		audio_path: audioPath,
		expected_lines: script.map((l) => l.text),
		model_size: "small",
	});
	return new Promise<any>((res) => {
		const p = spawn("uv", ["run", bridge, config]);
		let data = "";
		p.stdout.on("data", (d) => {
			process.stdout.write(d);
			if (d.toString().includes("REPORT:"))
				data = d.toString().split("REPORT:")[1].split("DONE")[0].trim();
		});
		p.on("close", () => {
			if (!data)
				return res({
					is_damaged: true,
					transcription: "",
					score: 0,
					hallucinations: [],
					segments: [],
					failure_type: "BRIDGE_CRASH",
				});
			const r = JSON.parse(data);
			const score = r.score || 0;
			const hallucinations = r.hallucinations || [];
			const failure_type = r.failure_type || "NONE";

			console.log(
				`[ASR] CER Score: ${score.toFixed(4)} | Hallucinations: ${hallucinations.length} | Type: ${failure_type}`,
			);

			const is_damaged = failure_type !== "NONE" || score < threshold;

			return res({
				is_damaged,
				transcription: r.transcription,
				score,
				hallucinations,
				failure_type,
				rms: r.rms,
				segments: r.segments || [],
			});
		});
	});
}

export async function verifySpeaker(
	sourcePath: string,
	targetPath: string,
	threshold = defaultConfig.validation.speaker_threshold,
) {
	const bridge = path.join(process.cwd(), "src/validation/speaker_bridge.py");
	const config = JSON.stringify({
		source_path: sourcePath,
		target_path: targetPath,
	});
	return new Promise<any>((res) => {
		const p = spawn("uv", ["run", bridge, config]);
		let data = "";
		p.stdout.on("data", (d) => {
			process.stdout.write(d);
			if (d.toString().includes("REPORT:"))
				data = d.toString().split("REPORT:")[1].split("DONE")[0].trim();
		});
		p.on("close", () => {
			if (!data) return res({ similarity: 0, is_consistent: false });
			const r = JSON.parse(data);
			const similarity = r.similarity || 0;
			console.log(`[SPEAKER] Similarity: ${similarity.toFixed(4)}`);
			return res({
				similarity,
				is_consistent: similarity >= threshold,
			});
		});
	});
}

export async function analyzeProsody(audioPath: string) {
	const bridge = path.join(process.cwd(), "src/validation/prosody_bridge.py");
	const config = JSON.stringify({ audio_path: audioPath });
	return new Promise<any>((res) => {
		const p = spawn("uv", ["run", bridge, config]);
		let data = "";
		p.stdout.on("data", (d) => {
			process.stdout.write(d);
			if (d.toString().includes("REPORT:"))
				data = d.toString().split("REPORT:")[1].split("DONE")[0].trim();
		});
		p.on("close", () => {
			if (!data) return res({ f0_mean: 0, energy_mean: 0, silence_ratio: 1 });
			const r = JSON.parse(data);
			console.log(
				`[PROSODY] F0: ${r.f0_mean.toFixed(1)}Hz | Energy: ${r.energy_mean.toFixed(4)} | Silence: ${(r.silence_ratio * 100).toFixed(1)}%`,
			);
			return res(r);
		});
	});
}
