import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { ASRValidator } from "../validation/asr";
import { VideoComposer } from "./composer";
import { IdentityEngine } from "./identity";
import { MetricsManager } from "./metrics";
import type { AssetStore } from "./storage";
import { IrodoriTtsEngine } from "./tts";
import type { ScriptLine } from "./types";

export class Orchestrator {
	constructor(
		private store: AssetStore,
		private assetDir: string,
		private config: {
			identity: {
				id: string;
				name: string;
				voice_id: string;
				overrides?: any;
			};
			script_path: string;
			image_path: string;
		},
	) {}

	async run() {
		const sessionId = `session-${Math.random().toString(36).substring(7)}`;
		const assetId = this.getNextAssetId();
		const prefix = `${assetId}_${sessionId}`;

		const baseIdentity = {
			...this.config.identity,
			voice_id: this.config.identity.voice_id,
			...this.config.identity.overrides,
		};
		const identity = new IdentityEngine(baseIdentity).getContract();
		const tts = new IrodoriTtsEngine();
		const asr = new ASRValidator();

		const fullScriptPath = path.resolve(this.assetDir, this.config.script_path);
		console.log(`[RESONANCE] Loading script from ${fullScriptPath}...`);
		if (!fs.existsSync(fullScriptPath)) {
			throw new Error(`CRITICAL: ${fullScriptPath} missing.`);
		}

		const rawScript = fs.readFileSync(fullScriptPath, "utf-8");
		const lines = this.parseScriptContent(rawScript);

		const audioParts: string[] = [];
		const verifiedLines: ScriptLine[] = [];
		const allSegments: any[] = [];
		let currentOffset = 0;
		const chunks = this.chunkLines(lines, 750);

		for (let i = 0; i < chunks.length; i++) {
			let pth = "";
			let segments: any[] = [];
			for (let v = 1; v <= 3; v++) {
				const p = this.store.getPath(`${prefix}_p${i}_v${v}.wav`);
				console.log(`[TTS] Chunk ${i + 1}/${chunks.length} (v${v})`);

				const cleanText = chunks[i]
					.map((l) => l.text.replace(/（.*?）|\(.*?\)/g, ""))
					.join(" ");

				await tts.synthesize({
					text: cleanText,
					caption: identity.voice_id,
					outputPath: p,
					seed: 2306 + i + v,
				});

				const report = await asr.validate(p, chunks[i]);
				if (!report.is_damaged) {
					pth = p;
					segments = report.segments;
					break;
				}
			}
			if (!pth)
				throw new Error(`Chunk ${i} Failure: Atmospheric Integrity Damage`);

			audioParts.push(pth);
			verifiedLines.push(
				...chunks[i].map((l) => ({
					...l,
				})),
			);

			// Track segments with offset
			for (const seg of segments) {
				allSegments.push({
					start: seg.start + currentOffset,
					end: seg.end + currentOffset,
					text: seg.text,
				});
			}

			// Update offset for next chunk (approximate using last segment end if available, or fetch real duration)
			if (segments.length > 0) {
				currentOffset += segments[segments.length - 1].end + 1.0; // Adding a small buffer for pause
			}
		}

		// Final Transcript Generation
		fs.writeFileSync(
			this.store.getPath(`${prefix}.json`),
			JSON.stringify(
				{
					sessionId,
					voice_identity: identity.voice_id,
					identity,
					lines: verifiedLines,
					segments: allSegments,
					total_chars: verifiedLines.reduce((s, l) => s + l.text.length, 0),
					produced_at: new Date().toISOString(),
				},
				null,
				2,
			),
		);

		// VTT Generation
		const vtt = [
			"WEBVTT",
			"",
			...allSegments.map((s) => {
				const formatTime = (t: number) => {
					const h = Math.floor(t / 3600);
					const m = Math.floor((t % 3600) / 60);
					const sec = (t % 60).toFixed(3);
					return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.padStart(6, "0")}`;
				};
				return `${formatTime(s.start)} --> ${formatTime(s.end)}\n${s.text.trim()}\n`;
			}),
		].join("\n");
		fs.writeFileSync(this.store.getPath(`${prefix}.vtt`), vtt);

		const audio = this.store.getPath(`${prefix}.wav`);
		await this.concat(audioParts, audio);

		const fullImagePath = path.resolve(this.assetDir, this.config.image_path);
		await new VideoComposer().compose({
			audioPath: audio,
			imagePath: fullImagePath,
			outputPath: this.store.getPath(`${prefix}.mp4`),
		});

		new MetricsManager().exportMarkdown("NUMBERS.md");
		console.log(`[DONE] ${sessionId}`);
	}

	private getNextAssetId(): string {
		const outDir = this.assetDir;
		const files = fs.readdirSync(outDir);
		const max = files
			.map((f) => Number.parseInt(f.split("_")[0], 10))
			.filter((n) => !Number.isNaN(n))
			.reduce((a, b) => Math.max(a, b), 0);
		return (max + 1).toString().padStart(4, "0");
	}

	private parseScriptContent(raw: string): ScriptLine[] {
		// Handle both raw markdown and JSON scenario files
		try {
			const json = JSON.parse(raw);
			if (Array.isArray(json)) {
				return json.map((l: any) => ({
					text: l.text,
					pause_after: l.pause || 5,
				}));
			}
		} catch {
			// Fallback to markdown parser
		}

		return raw
			.split(/\n\n+/)
			.filter((t) => t.trim().length > 0)
			.map((text) => ({
				text: text.trim(),
				pause_after: 5 + Math.random() * 5,
			}));
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
