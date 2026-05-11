import { spawn } from "node:child_process";
import * as path from "node:path";
import type { ScriptLine } from "../runtime/types";

export class ASRValidator {
	async validate(
		audioPath: string,
		script: ScriptLine[],
		threshold: number,
	): Promise<{ is_damaged: boolean; transcription: string; segments: any[] }> {
		const bridge = path.join(process.cwd(), "src/validation/asr_bridge.py");
		const config = JSON.stringify({
			audio_path: audioPath,
			expected_lines: script.map((l) => l.text),
		});
		return new Promise((res) => {
			const p = spawn("uv", ["run", bridge, config]);
			let data = "";
			p.stdout.on("data", (d) => {
				if (d.toString().includes("REPORT:"))
					data = d.toString().split("REPORT:")[1].split("DONE")[0].trim();
			});
			p.on("close", () => {
				if (!data)
					return res({ is_damaged: true, transcription: "", segments: [] });
				const r = JSON.parse(data);
				const avgScore =
					r.line_scores.reduce((a: any, b: any) => a + b.score, 0) /
					r.line_scores.length;
				console.log(
					`[ASR] Score: ${avgScore.toFixed(4)} | Trans: ${r.transcription.substring(0, 100)}...`,
				);

				res({
					is_damaged: avgScore < threshold,
					transcription: r.transcription,
					segments: r.segments || [],
				});
			});
		});
	}
}
