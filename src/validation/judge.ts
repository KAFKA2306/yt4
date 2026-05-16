import type { AuditTrace, FailType, RepairAction } from "../runtime/types";

export class QualityJudge {
	async classify(trace: Partial<AuditTrace>): Promise<{
		status: "PASS" | "FAIL";
		fail_types: FailType[];
		repair_candidate?: RepairAction;
		confidence: number;
		evidence: string;
	}> {
		const metrics = trace.metrics;

		const fail_types: FailType[] = [];
		if ((metrics?.cer ?? 1) < 0.85) fail_types.push("LOW_INTELLIGIBILITY");
		if ((metrics?.hallucinations ?? 0) > 0) fail_types.push("REPETITION_LOOP");
		if ((metrics?.speaker_sim ?? 1) < 0.85) fail_types.push("SPEAKER_DRIFT");
		if ((metrics?.silence_ratio ?? 0) > 0.12)
			fail_types.push("SILENCE_CORRUPTION");

		const status = fail_types.length > 0 ? "FAIL" : "PASS";

		let repair: RepairAction | undefined;
		if (fail_types.includes("SPEAKER_DRIFT")) repair = "refresh_reference";
		else if (fail_types.includes("REPETITION_LOOP")) repair = "split_chunk";
		else if (fail_types.includes("LOW_INTELLIGIBILITY"))
			repair = "lower_temperature";

		return {
			status,
			fail_types,
			repair_candidate: repair,
			confidence: 1.0,
			evidence: fail_types.join(", "),
		};
	}
}
