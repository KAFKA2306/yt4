import { join } from "node:path";

export class AssetStore {
	constructor(private baseDir: string) {}
	getPath(...s: string[]) {
		return join(this.baseDir, ...s);
	}
}
