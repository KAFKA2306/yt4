import { spawn } from "node:child_process";
import * as path from "node:path";

export async function synthesizeVoice(o: {
	text: string;
	caption: string;
	outputPath: string;
	seed: number;
	temperature: number;
	num_steps: number;
	seconds?: number | null;
	no_ref: boolean;
	duration_scale?: number;
	refWav?: string;
}): Promise<string> {
	const bridge = path.join(process.cwd(), "src/runtime/tts_bridge.py");
	const config = JSON.stringify({
		text: o.text,
		caption: o.caption,
		output_path: o.outputPath,
		seed: o.seed,
		temperature: o.temperature,
		num_steps: o.num_steps,
		seconds: o.seconds,
		no_ref: o.no_ref,
		duration_scale: o.duration_scale ?? 1.0,
		ref_wav: o.refWav,
	});
	return new Promise((res, rej) => {
		const p = spawn("uv", ["run", bridge, config]);
		let stdout = "";
		let donePath = "";

		p.stdout.on("data", (d) => {
			stdout += d.toString();
			const marker = stdout.indexOf("DONE:");
			if (marker >= 0) {
				donePath = stdout
					.slice(marker + 5)
					.trim()
					.split(/\r?\n/, 1)[0];
			}
		});
		p.stderr.on("data", (d) => {
			process.stderr.write(d);
		});
		p.on("error", (err) => rej(err));
		p.on("close", (c) => {
			if (c === 0 && donePath) return res(donePath);
			return rej(
				new Error(
					`TTS bridge failed (code ${c}); stdout=${stdout.slice(0, 500)}`,
				),
			);
		});
	});
}
