import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface TtsOptions {
	text: string;
	caption: string;
	outputPath: string;
	seed?: number;
}

export class IrodoriTtsEngine {
	async synthesize(options: TtsOptions): Promise<string> {
		const bridgePath = path.join(process.cwd(), "src/runtime/tts_bridge.py");
		const config = JSON.stringify({
			text: options.text,
			caption: options.caption,
			output_path: options.outputPath,
			seed: options.seed ?? 2306,
		});

		return new Promise((resolve, reject) => {
			const proc = spawn("uv", ["run", bridgePath, config]);

			proc.stdout.on("data", (data) => {
				const out = data.toString();
				if (out.includes("DONE:")) {
					resolve(out.split("DONE:")[1].trim());
				}
			});

			proc.stderr.on("data", (data) => {
				console.error(`[TTS_BRIDGE_ERROR] ${data}`);
			});

			proc.on("close", (code) => {
				if (code !== 0) {
					reject(new Error(`TTS bridge exited with code ${code}`));
				}
			});
		});
	}
}
