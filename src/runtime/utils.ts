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
	if (Array.isArray(json)) {
		return json.map((l: any) => ({
			text: l.text,
			pause_after: l.pause ?? 5,
			emotion: l.emotion,
		}));
	}

	return raw
		.split(/\n\n+/)
		.filter((t) => t.trim().length > 0)
		.map((text) => ({
			text: text.trim(),
			pause_after: 5 + Math.random() * 5,
		}));
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
		emotion.softness > 0.95
			? "囁き声、極めて繊細。"
			: "柔らかな声、落ち着いた。";
	const emotionDesc =
		emotion.valence > 0.4 ? "慈愛に満ちた包容力。" : "静かな夜の情緒。";
	return `${baseVoice} ${softness} ${emotionDesc}`;
}
