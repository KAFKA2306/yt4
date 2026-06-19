import * as fs from "node:fs";

export interface CoherenceResult {
	status: "PASS" | "FAIL" | "WARN";
	findings: {
		node: string;
		file: string;
		message: string;
		severity: string;
	}[];
}

export async function verifyCoherence(): Promise<CoherenceResult> {
	const findings: CoherenceResult["findings"] = [];
	const glob = new Bun.Glob("src/**/*.ts");
	const tryCatchPattern = /try\s*\{/;

	const configPath = "codd.yaml";
	let config: any = {};
	if (fs.existsSync(configPath)) {
		const yaml = await import("yaml");
		config = yaml.parse(fs.readFileSync(configPath, "utf-8"));
	}

	for await (const file of glob.scan(".")) {
		const content = await Bun.file(file).text();
		const stat = fs.statSync(file);

		if (file.includes("runtime/") || file.includes("domain/")) {
			if (tryCatchPattern.test(content)) {
				findings.push({
					node: "ADR-0024",
					file,
					message:
						"Forbidden 'try-catch' detected. Violates Crash-Driven Development principle.",
					severity: "CRITICAL",
				});
			}
		}

		if (content.includes("TODO") || content.includes("FIXME")) {
			findings.push({
				node: "Zero-Fat",
				file,
				message: "Unresolved TODO/FIXME detected. Codebase must be zero-fat.",
				severity: "LOW",
			});
		}

		const isLinked = config.graph?.nodes?.some(
			(n: any) =>
				n.path === file ||
				(n.kind === "implementation" && file.startsWith("src/runtime/")),
		);
		if (!isLinked && file.includes("runtime/")) {
			findings.push({
				node: "Elicit",
				file,
				message:
					"Architectural Gap: No requirement/design node found for this implementation file.",
				severity: "WARN",
			});
		}

		const linkedAdr = config.graph?.nodes?.find(
			(n: any) => n.id === "ADR-0024",
		)?.path;
		if (linkedAdr && fs.existsSync(linkedAdr)) {
			const adrStat = fs.statSync(linkedAdr);
			if (stat.mtimeMs > adrStat.mtimeMs + 3600000) {
				findings.push({
					node: "Drift",
					file,
					message: `Architectural Drift: Implementation is newer than its requirement (${linkedAdr}).`,
					severity: "LOW",
				});
			}
		}
	}

	const adr24 = "docs/adr/0024-strict-determinism-crash-driven.md";
	if (!fs.existsSync(adr24)) {
		findings.push({
			node: "DAG",
			file: adr24,
			message: "Requirement node missing: ADR-0024",
			severity: "CRITICAL",
		});
	}

	const status = findings.some((f) => f.severity === "CRITICAL")
		? "FAIL"
		: findings.length > 0
			? "WARN"
			: "PASS";

	return { status, findings };
}
