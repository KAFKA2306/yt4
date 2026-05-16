import { spawn } from "node:child_process";
import * as path from "node:path";
import type { ScriptLine } from "../runtime/types";

export class ASRValidator {
	async validate(
		audioPath: string,
		script: ScriptLine[],
		threshold = 0.8,
	): Promise<{
		is_damaged: boolean;
		transcription: string;
		score: number;
		hallucinations: string[];
		segments: any[];
	}> {
		const bridge = path.join(process.cwd(), "src/validation/asr_bridge.py");
		const config = JSON.stringify({
			audio_path: audioPath,
			expected_lines: script.map((l) => l.text),
		});
		return new Promise((res) => {
			const p = spawn("uv", ["run", bridge, config]);
			let data = "";
			p.stdout.on("data", (d) => {
				const s = d.toString();
				console.log(s.trim());
				if (s.includes("REPORT:"))
					data = s.split("REPORT:")[1].split("DONE")[0].trim();
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

				const isDamaged = score < threshold || hallucinations.length > 3;

				res({
					is_damaged: isDamaged,
					transcription: r.transcription,
					score: score,
					hallucinations: hallucinations,
					segments: r.segments || [],
				});
			});
		});
	}
}
