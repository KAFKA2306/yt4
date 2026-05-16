import * as crypto from "node:crypto";
import * as fs from "node:fs";

import type { AuditTrace } from "./types";

export class AuditLogger {
	constructor(private logPath: string) {}

	log(entry: AuditTrace) {
		const line = `${JSON.stringify(entry)}\n`;
		fs.appendFileSync(this.logPath, line);
	}

	static calculateHash(data: string | Buffer): string {
		return crypto.createHash("sha256").update(data).digest("hex");
	}
}
