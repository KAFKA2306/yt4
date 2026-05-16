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
	});
	return new Promise((res, rej) => {
		const p = spawn("uv", ["run", bridge, config]);
		p.stdout.on("data", (d) => {
			if (d.toString().includes("DONE:"))
				res(d.toString().split("DONE:")[1].trim());
		});
		p.on("close", (c) => (c === 0 ? null : rej(new Error(`TTS: ${c}`))));
	});
}
