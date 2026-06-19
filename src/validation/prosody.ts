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
			let stdout = "";
			p.stdout.on("data", (d) => {
				const s = d.toString();
				stdout += s;
				process.stdout.write(d);
				const reportStart = stdout.indexOf("REPORT:");
				const doneStart = stdout.indexOf(
					"DONE",
					reportStart >= 0 ? reportStart : 0,
				);
				if (reportStart >= 0 && doneStart >= 0) {
					data = stdout.slice(reportStart + 7, doneStart).trim();
				}
			});
			p.on("error", () =>
				res({ f0_mean: 0, energy_mean: 0, silence_ratio: 1 }),
			);
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
