import { spawn } from "node:child_process";
import * as path from "node:path";

export class ProsodyValidator {
	async analyze(audioPath: string): Promise<{
		f0_mean: number;
		energy_mean: number;
		silence_ratio: number;
	}> {
		const bridge = path.join(process.cwd(), "src/validation/prosody_bridge.py");
		const config = JSON.stringify({ audio_path: audioPath });

		return new Promise((res) => {
			const p = spawn("uv", ["run", bridge, config]);
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
				res(r);
			});
		});
	}
}
