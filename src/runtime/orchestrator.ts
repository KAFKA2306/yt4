import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { ASRValidator } from "../validation/asr";
import { VideoComposer } from "./composer";
import { IdentityEngine } from "./identity";
import { MetricsManager } from "./metrics";
import { PulseManager } from "./pulse";
import type { AssetStore } from "./storage";
import { IrodoriTtsEngine } from "./tts";
import type { ScriptLine } from "./types";

export class Orchestrator {
	constructor(
		private store: AssetStore,
		private identityData: any,
	) {}

	async run() {
		const sessionId = path.basename(this.store.getPath("."));
		const identity = new IdentityEngine(this.identityData).getContract();
		const tts = new IrodoriTtsEngine();
		const asr = new ASRValidator();

		console.log(`[RESONANCE] Loading dynamic prompt...`);
		const promptPath = path.join(
			process.cwd(),
			"prompts/asmr_best_situation.json",
		);
		const prompt = JSON.parse(fs.readFileSync(promptPath, "utf-8"));

		const pulse = await new PulseManager().observe();
		const lines = this.synthesizeFromPrompt(prompt, pulse);

		fs.writeFileSync(
			path.join(process.cwd(), "transcripts", `${sessionId}.json`),
			JSON.stringify(
				{
					sessionId,
					identity,
					lines,
					total: lines.reduce((s, l) => s + l.text.length, 0),
				},
				null,
				2,
			),
		);

		const audioParts: string[] = [];
		const chunks = this.chunkLines(lines, 750);

		for (let i = 0; i < chunks.length; i++) {
			let pth = "";
			for (let v = 1; v <= 3; v++) {
				const p = this.store.getPath(`p${i}_v${v}.wav`);
				console.log(`[TTS] Chunk ${i + 1}/${chunks.length} (v${v})`);
				await tts.synthesize({
					text: chunks[i].map((l) => l.text).join(" "),
					caption: identity.preferred_atmosphere,
					outputPath: p,
					seed: 2306 + i + v,
				});
				if (!(await asr.validate(p, chunks[i])).is_damaged) {
					pth = p;
					break;
				}
			}
			if (!pth) throw new Error(`Chunk ${i} Failure`);
			audioParts.push(pth);
		}

		const audio = this.store.getPath("final_mix.wav");
		await this.concat(audioParts, audio);
		await new VideoComposer().compose({
			audioPath: audio,
			imagePath: "assets/thumbnail.png",
			outputPath: this.store.getPath("final_video.mp4"),
		});

		new MetricsManager().exportMarkdown("NUMBERS.md");
		console.log(`[DONE] ${sessionId}`);
	}

	private synthesizeFromPrompt(prompt: any, pulse: any): ScriptLine[] {
		const emotion = {
			valence: 0.15,
			arousal: 0.05,
			softness: 0.98,
			atmosphere: pulse.atmosphere,
		};
		const script: ScriptLine[] = [];
		const targetLength = 5000;

		// 1. Intro
		prompt.phases[0].lines.forEach((l: any) => {
			script.push({ text: l.text, emotion, pause_after: l.pause });
		});

		// 2. Body Expansion (Intimacy & Connection)
		const bodyPhases = [prompt.phases[1], prompt.phases[2]];
		while (script.reduce((s, l) => s + l.text.length, 0) < targetLength - 500) {
			const phase = bodyPhases[Math.floor(Math.random() * bodyPhases.length)];
			const line = phase.lines[Math.floor(Math.random() * phase.lines.length)];
			script.push({
				text: line.text,
				emotion,
				pause_after: line.pause + Math.random() * 5,
			});
		}

		// 3. Ending
		prompt.phases[3].lines.forEach((l: any) => {
			script.push({ text: l.text, emotion, pause_after: l.pause });
		});

		return script;
	}

	private chunkLines(ls: ScriptLine[], t: number) {
		const res: ScriptLine[][] = [];
		let cur: ScriptLine[] = [];
		let c = 0;
		for (const l of ls) {
			cur.push(l);
			c += l.text.length;
			if (c >= t) {
				res.push(cur);
				cur = [];
				c = 0;
			}
		}
		if (cur.length > 0) res.push(cur);
		return res;
	}

	private async concat(ps: string[], out: string) {
		const f = this.store.getPath("ps.txt");
		fs.writeFileSync(f, ps.map((p) => `file '${path.resolve(p)}'`).join("\n"));
		return new Promise<void>((res, rej) => {
			const p = spawn("ffmpeg", [
				"-y",
				"-f",
				"concat",
				"-safe",
				"0",
				"-i",
				f,
				"-c",
				"copy",
				out,
			]);
			p.on("close", (c) => (c === 0 ? res() : rej(c)));
		});
	}
}
