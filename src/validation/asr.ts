import { spawn } from "node:child_process";
import * as path from "node:path";
import type { ScriptLine } from "../runtime/types";
import { ASR_THRESHOLD } from "./thresholds";

export class ASRValidator {
	async validate(
		audioPath: string,
		script: ScriptLine[],
		threshold = ASR_THRESHOLD,
	): Promise<{
		is_damaged: boolean;
		transcription: string;
		score: number;
		hallucinations: string[];
		failure_type?: string;
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
				res({
					is_damaged: true,
					transcription: "",
					score: 0,
					hallucinations: [],
					segments: [],
				}),
			);
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
				const failureType = r.failure_type || "NONE";

				console.log(
					`[ASR] CER Score: ${score.toFixed(4)} | Hallucinations: ${hallucinations.length} | Type: ${failureType}`,
				);

				const isWhisperLimit = failureType === "WHISPER_LIMIT";
				const isDamaged =
					!isWhisperLimit && (score < threshold || hallucinations.length > 3);

				res({
					is_damaged: isDamaged,
					transcription: r.transcription,
					score: score,
					hallucinations: hallucinations,
					failure_type: failureType,
					segments: r.segments || [],
				});
			});
		});
	}
}
