import * as fs from "node:fs";
import * as path from "node:path";
import { Publisher } from "../runtime/publisher";
import { verifyCoherence } from "./coherence";
import { verifyContract } from "./contract";

async function main() {
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

	const dir =
		process.argv[2] && !process.argv[2].startsWith("--")
			? process.argv[2]
			: "transcripts";
	const isLive = process.argv.includes("--live");
	const publisher = isLive ? new Publisher(dir) : null;

	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	const files = fs.readdirSync(dir).filter((f) => f.endsWith("_CONTRACT.json"));

	console.log(`[AUDIT] Scanning ${dir} for Zero-Trust contracts...`);
	let passCount = 0;
	let failCount = 0;

	for (const file of files) {
		const p = path.join(dir, file);
		const claim = JSON.parse(fs.readFileSync(p, "utf-8"));
		const result = verifyContract(claim, dir);

		let status = result.status;
		let reason = result.reason ? ` | REASON: ${result.reason}` : "";

		if (isLive && claim.verification.remote_proof && status === "PASS") {
			try {
				if (!publisher) {
					throw new Error("Live audit requested without a YouTube publisher.");
				}
				const actualVisibility = await publisher.getVideoVisibility(
					claim.verification.remote_proof.videoId,
				);
				if (actualVisibility !== "public") {
					status = "QUALITY_FAIL";
					reason = ` | REASON: Remote Visibility Violation (${actualVisibility})`;
				} else {
					status = "PASS";
					reason = " | REASON: Remote Visibility Verified (public)";
				}
			} catch (e: any) {
				status = "UNVERIFIED";
				reason = ` | REASON: Remote Check Failed (${e.message})`;
			}
		}

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
