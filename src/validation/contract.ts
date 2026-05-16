import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AuditStatus, ProductionState } from "../runtime/types";

export interface CompletionClaim {
	version: string;
	timestamp: string;
	sessionId: string;
	identity: {
		id: string;
		name: string;
		voice_id: string;
	};
	inputs: Record<string, string>; // path -> hash
	outputs: Record<string, string>; // path -> hash
	verification: {
		asr_score: number;
		status: AuditStatus;
		production_state: ProductionState;
		remote_proof?: {
			platform: "youtube";
			videoId: string;
			visibility: string;
			raw_response_hash: string;
		};
		evidence: {
			machine_logs: string[];
			runtime_traces: Record<string, any>;
		};
	};
	environment: {
		node_version: string;
		platform: string;
		cwd: string;
	};
}

const CONTRACT_VERSION = "2.0.0";

export function hashFile(filePath: string): string {
	if (!fs.existsSync(filePath)) return "MISSING";
	const buffer = fs.readFileSync(filePath);
	return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function certifyContract(params: {
	sessionId: string;
	identity: { id: string; name: string; voice_id: string };
	inputPaths: string[];
	outputPaths: string[];
	asrScore: number;
	logs: string[];
	traces?: Record<string, any>;
	productionState: ProductionState;
	remoteProof?: { videoId: string; visibility: string; rawResponse: string };
}): CompletionClaim {
	const inputs: Record<string, string> = {};
	for (const p of params.inputPaths) {
		inputs[path.basename(p)] = hashFile(p);
	}

	const outputs: Record<string, string> = {};
	for (const p of params.outputPaths) {
		outputs[path.basename(p)] = hashFile(p);
	}

	let status: AuditStatus = "UNVERIFIED";
	// Align contract quality with the runtime acceptance floor.
	if (params.asrScore < 0.85) {
		status = "QUALITY_FAIL";
	} else {
		status = "PASS";
	}

	let remote_proof: any;
	if (params.remoteProof) {
		remote_proof = {
			platform: "youtube",
			videoId: params.remoteProof.videoId,
			visibility: params.remoteProof.visibility,
			raw_response_hash: crypto
				.createHash("sha256")
				.update(params.remoteProof.rawResponse)
				.digest("hex"),
		};
	}

	return {
		version: CONTRACT_VERSION,
		timestamp: new Date().toISOString(),
		sessionId: params.sessionId,
		identity: params.identity,
		inputs,
		outputs,
		verification: {
			asr_score: params.asrScore,
			status,
			production_state: params.productionState,
			remote_proof,
			evidence: {
				machine_logs: params.logs,
				runtime_traces: params.traces || {},
			},
		},
		environment: {
			node_version: process.version,
			platform: process.platform,
			cwd: process.cwd(),
		},
	};
}

export function verifyContract(
	claim: CompletionClaim,
	baseDir: string,
): { status: AuditStatus; reason?: string } {
	for (const [name, expectedHash] of Object.entries(claim.outputs)) {
		const p = path.join(baseDir, name);
		const actualHash = hashFile(p);
		if (actualHash === "MISSING")
			return { status: "QUALITY_FAIL", reason: `Artifact Missing: ${name}` };
		if (actualHash !== expectedHash)
			return {
				status: "QUALITY_FAIL",
				reason: `Integrity Breach: ${name} (Hash Mismatch)`,
			};
	}

	for (const name of Object.keys(claim.outputs)) {
		const p = path.join(baseDir, name);
		const stat = fs.statSync(p);
		const claimTime = new Date(claim.timestamp).getTime();
		if (stat.mtimeMs < claimTime - 10000) {
			return {
				status: "QUALITY_FAIL",
				reason: `Artifact Replay Detected: ${name} is older than contract`,
			};
		}
	}

	if (claim.verification.evidence.machine_logs.length === 0) {
		return {
			status: "UNVERIFIED",
			reason: "Zero Evidence: Machine logs missing",
		};
	}

	const logText = claim.verification.evidence.machine_logs.join("\n");
	if (!logText.includes(claim.sessionId)) {
		return {
			status: "QUALITY_FAIL",
			reason: `Identity Breach: SessionID ${claim.sessionId} not found in logs`,
		};
	}

	// Remote Proof Enforcement
	const state = claim.verification.production_state;
	if (
		state === "UPLOAD_CONFIRMED" ||
		state === "YOUTUBE_FETCH_CONFIRMED" ||
		state === "STUDIO_VISIBLE" ||
		state === "PUBLIC_REACHABLE"
	) {
		if (!claim.verification.remote_proof) {
			return {
				status: "UNVERIFIED",
				reason: `Bounded Honesty Failure: Remote proof missing for state ${state}`,
			};
		}

		if (claim.verification.remote_proof.visibility !== "public") {
			return {
				status: "QUALITY_FAIL",
				reason: `Visibility Violation: Expected public but got ${claim.verification.remote_proof.visibility}`,
			};
		}
	}

	return { status: claim.verification.status };
}
