import { mkdirSync } from "node:fs";
import { join } from "node:path";

export class AssetStore {
  private baseDir: string;

  constructor(private sessionId: string) {
    const date = new Date().toISOString().split("T")[0];
    this.baseDir = join(process.cwd(), "runs", date, sessionId);
    mkdirSync(this.baseDir, { recursive: true });
    mkdirSync(join(this.baseDir, "parts"), { recursive: true });
    mkdirSync(join(this.baseDir, "asr_quality"), { recursive: true });
  }

  getPath(...segments: string[]): string {
    return join(this.baseDir, ...segments);
  }

  async saveJson(filename: string, data: any): Promise<void> {
    const path = this.getPath(filename);
    await Bun.write(path, JSON.stringify(data, null, 2));
  }

  async saveText(filename: string, content: string): Promise<void> {
    const path = this.getPath(filename);
    await Bun.write(path, content);
  }
}
