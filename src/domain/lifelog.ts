import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { type LifeLogTriple, LifeLogTripleSchema } from "../runtime/types";

export class LifeLogManager {
	private filePath: string;

	constructor(storagePath: string) {
		this.filePath = storagePath;
		const dir = dirname(this.filePath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
	}

	append(triple: LifeLogTriple): void {
		const validated = LifeLogTripleSchema.parse(triple);
		appendFileSync(this.filePath, `${JSON.stringify(validated)}\n`);
	}

	getAll(): LifeLogTriple[] {
		if (!existsSync(this.filePath)) return [];
		return readFileSync(this.filePath, "utf-8")
			.split("\n")
			.filter((line) => line.trim() !== "")
			.map((line) => LifeLogTripleSchema.parse(JSON.parse(line)));
	}

	search(query: string): LifeLogTriple[] {
		const all = this.getAll();
		return all.filter(
			(t) =>
				t.subject.includes(query) ||
				t.predicate.includes(query) ||
				t.object.includes(query),
		);
	}
}
