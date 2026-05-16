import { spawn } from "node:child_process";
import * as path from "node:path";

export class SpeakerValidator {
	async verify(
		sourcePath: string,
		targetPath: string,
		threshold = 0.85,
	): Promise<{ similarity: number; is_consistent: boolean }> {
		const bridge = path.join(process.cwd(), "src/validation/speaker_bridge.py");
		const config = JSON.stringify({
			source_path: sourcePath,
			target_path: targetPath,
		});

		return new Promise((res) => {
			const p = spawn("uv", ["run", bridge, config]);
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

				res({
					similarity: similarity,
					is_consistent: similarity >= threshold,
				});
			});
		});
	}
}
