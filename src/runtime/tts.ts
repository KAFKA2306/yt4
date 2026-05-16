import { spawn } from "node:child_process";
import * as path from "node:path";

export async function synthesizeVoice(o: {
	text: string;
	caption: string;
	outputPath: string;
	seed?: number;
	temperature?: number;
}): Promise<string> {
	const bridge = path.join(process.cwd(), "src/runtime/tts_bridge.py");
	const config = JSON.stringify({
		text: o.text,
		caption: o.caption,
		output_path: o.outputPath,
		seed: o.seed ?? 2306,
		temperature: o.temperature ?? 0.7,
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
