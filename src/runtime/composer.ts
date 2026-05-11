import { spawn } from "node:child_process";

export interface VideoOptions {
  audioPath: string;
  imagePath: string;
  outputPath: string;
}

export class VideoComposer {
  async compose(options: VideoOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        "-y",
        "-loop", "1",
        "-i", options.imagePath,
        "-i", options.audioPath,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-pix_fmt", "yuv420p",
        options.outputPath
      ];

      const proc = spawn("ffmpeg", args);

      proc.on("close", (code) => {
        if (code === 0) {
          resolve(options.outputPath);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });
  }
}
