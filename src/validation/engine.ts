import { spawn } from "node:child_process";
import * as path from "node:path";
import type { ScriptLine } from "../runtime/types";

export async function validateASR(
	audioPath: string,
	script: ScriptLine[],
	threshold = 0.8,
) {
	const bridge = path.join(process.cwd(), "src/validation/asr_bridge.py");
	const config = JSON.stringify({
		audio_path: audioPath,
		expected_lines: script.map((l) => l.text),
	});
	return new Promise<any>((res) => {
		const p = spawn("uv", ["run", bridge, config]);
		let data = "";
		p.stdout.on("data", (d) => {
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
				});
			const r = JSON.parse(data);
			const score = r.score || 0;
			const hallucinations = r.hallucinations || [];
			console.log(
				`[ASR] CER Score: ${score.toFixed(4)} | Hallucinations: ${hallucinations.length}`,
			);
			return res({
				is_damaged: score < threshold || hallucinations.length > 3,
				transcription: r.transcription,
				score,
				hallucinations,
				segments: r.segments || [],
			});
		});
	});
}

export async function verifySpeaker(
	sourcePath: string,
	targetPath: string,
	threshold = 0.85,
) {
	const bridge = path.join(process.cwd(), "src/validation/speaker_bridge.py");
	const config = JSON.stringify({
		source_path: sourcePath,
		target_path: targetPath,
	});
	return new Promise<any>((res) => {
		const p = spawn("python3", [bridge, config]);
		let data = "";
		p.stdout.on("data", (d) => {
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
		const p = spawn("python3", [bridge, config]);
		let data = "";
		p.stdout.on("data", (d) => {
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
