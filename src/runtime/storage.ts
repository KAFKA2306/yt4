import { mkdirSync } from "node:fs";
import { join } from "node:path";

export class AssetStore {
	private baseDir: string;
	constructor(id: string) {
		this.baseDir = join(
			process.cwd(),
			"runs",
			new Date().toISOString().split("T")[0],
			id,
		);
		mkdirSync(this.baseDir, { recursive: true });
	}
	getPath(...s: string[]) {
		return join(this.baseDir, ...s);
	}
}
