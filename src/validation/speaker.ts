import { spawn } from "node:child_process";
import * as path from "node:path";
import { SPEAKER_THRESHOLD } from "./thresholds";

export class SpeakerValidator {
	async verify(
		sourcePath: string,
		targetPath: string,
		threshold = SPEAKER_THRESHOLD,
	): Promise<{ similarity: number; is_consistent: boolean }> {
		const bridge = path.join(process.cwd(), "src/validation/speaker_bridge.py");
		const config = JSON.stringify({
			source_path: sourcePath,
			target_path: targetPath,
		});

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
			p.on("error", () => res({ similarity: 0, is_consistent: false }));
			p.on("close", () => {
				if (!data) return res({ similarity: 0, is_consistent: false });
				const r = JSON.parse(data);
				const similarity = r.similarity || 0;

				console.log(`[SPEAKER] Similarity: ${similarity.toFixed(4)}`);

				res({
					similarity: similarity,
					is_consistent: similarity >= threshold,
				});
			});
		});
	}
}
