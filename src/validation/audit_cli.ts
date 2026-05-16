import * as fs from "node:fs";
import * as path from "node:path";
import { verifyCoherence } from "./coherence";
import { verifyContract } from "./contract";

async function main() {
	// 1. Coherence Audit (CoDD)
	console.log("[AUDIT] Starting Coherence Verification (CoDD)...");
	const coherence = await verifyCoherence();
	if (coherence.findings.length > 0) {
		const prefix = coherence.status === "FAIL" ? " [FAIL]" : " [WARN]";
		console.log(`${prefix} Coherence Findings:`);
		for (const f of coherence.findings) {
			console.log(`  - [${f.node}] ${f.file}: ${f.message} (${f.severity})`);
		}
		if (coherence.status === "FAIL") process.exit(1);
	}
	console.log(` [PASS] Coherence Status: ${coherence.status}\n`);

	if (process.argv.includes("--coherence-only")) {
		process.exit(0);
	}

	const dir = process.argv[2] || "transcripts";
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	const files = fs.readdirSync(dir).filter((f) => f.endsWith("_CONTRACT.json"));

	console.log(`[AUDIT] Scanning ${dir} for Zero-Trust contracts...`);
	let passCount = 0;
	let failCount = 0;

	for (const file of files) {
		const p = path.join(dir, file);
		const claim = JSON.parse(fs.readFileSync(p, "utf-8"));
		const result = verifyContract(claim, dir);

		const status = result.status;
		const reason = result.reason ? ` | REASON: ${result.reason}` : "";

		console.log(
			`| ${claim.sessionId} | ${claim.identity.name} | ${status}${reason} |`,
		);

		if (status === "PASS") passCount++;
		else failCount++;
	}

	console.log(`\n[RESULT] PASS: ${passCount} | FAIL/UNVERIFIED: ${failCount}`);
	if (failCount > 0) process.exit(1);
}

main();
