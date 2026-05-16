import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { EmotionalState, ScriptLine } from "./types";

export function getNextAssetId(assetDir: string): string {
	const files = fs.readdirSync(assetDir);
	const max = files
		.map((f) => Number.parseInt(f.split("_")[0], 10))
		.filter((n) => !Number.isNaN(n))
		.reduce((a, b) => Math.max(a, b), 0);
	return (max + 1).toString().padStart(4, "0");
}

export function parseScriptContent(raw: string): ScriptLine[] {
	const json = JSON.parse(raw);
	if (!Array.isArray(json)) {
		throw new Error("CRITICAL: Script must be a JSON array of ScriptLine.");
	}

	return json.map((l: any) => {
		if (l.pause === undefined) {
			throw new Error(`CRITICAL: 'pause' field missing in line: ${l.text}`);
		}
		return {
			text: l.text,
			pause_after: l.pause,
			emotion: l.emotion,
		};
	});
}

export function chunkLines(ls: ScriptLine[], t: number) {
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

export async function concatAudio(ps: string[], out: string) {
	const psFile = `${out}.ps.txt`;
	fs.writeFileSync(
		psFile,
		ps.map((p) => `file '${path.resolve(p)}'`).join("\n"),
	);
	return new Promise<void>((res, rej) => {
		const p = spawn("ffmpeg", [
			"-y",
			"-f",
			"concat",
			"-safe",
			"0",
			"-i",
			psFile,
			"-c",
			"copy",
			out,
		]);
		p.on("close", (c) => {
			if (fs.existsSync(psFile)) fs.unlinkSync(psFile);
			return c === 0 ? res() : rej(c);
		});
	});
}

export function generateCaption(
	baseVoice: string,
	emotion: EmotionalState,
): string {
	const softness =
		emotion.softness > 0.9
			? "極めて繊細で密着感のある囁き声。"
			: emotion.softness > 0.7
				? "吐息混じりの、穏やかで柔らかな囁き声。"
				: "落ち着きのある、優しく包み込むような声。";
	const valence =
		emotion.valence > 0.7
			? "深い慈愛と、どこか執着を感じさせる幸福感。"
			: emotion.valence > 0.3
				? "献身的で、穏やかな優しさ。"
				: "静かな夜に溶け込むような、少し憂いを含んだ情緒。";
	const arousal =
		emotion.arousal > 0.4
			? "高揚した感情、耳元で熱を帯びた吐息。"
			: emotion.arousal > 0.2
				? "静かに熱を帯びた、親密な距離感。"
				: "極めて落ち着いた、沈着冷静で深淵な響き。";

	return `[VoiceDesign] ${softness} ${valence} ${arousal}`;
}
