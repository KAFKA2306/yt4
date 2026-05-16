import { spawn } from "node:child_process";

export async function composeVideo(o: {
	audioPath: string;
	imagePath: string;
	outputPath: string;
}): Promise<string> {
	return new Promise((res, rej) => {
		const p = spawn("ffmpeg", [
			"-y",
			"-loop",
			"1",
			"-i",
			o.imagePath,
			"-i",
			o.audioPath,
			"-c:v",
			"libx264",
			"-tune",
			"stillimage",
			"-vf",
			"scale=trunc(iw/2)*2:trunc(ih/2)*2",
			"-c:a",
			"aac",
			"-b:a",
			"192k",
			"-shortest",
			"-pix_fmt",
			"yuv420p",
			o.outputPath,
		]);
		p.on("close", (c) =>
			c === 0 ? res(o.outputPath) : rej(new Error(`FFmpeg: ${c}`)),
		);
	});
}
