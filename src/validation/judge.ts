import type { AuditTrace, FailType, RepairAction } from "../runtime/types";
import { ASR_THRESHOLD, SPEAKER_THRESHOLD } from "./thresholds";

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
		const cer = metrics?.cer ?? 1;
		const hallucinations = metrics?.hallucinations ?? 0;
		const speakerSim = metrics?.speaker_sim ?? 1;
		const silenceRatio = metrics?.silence_ratio ?? 0;

		const whisperLimitPass =
			cer < ASR_THRESHOLD &&
			speakerSim >= SPEAKER_THRESHOLD &&
			silenceRatio <= 0.12 &&
			hallucinations === 0;

		if (cer < ASR_THRESHOLD && !whisperLimitPass) {
			fail_types.push("LOW_INTELLIGIBILITY");
		}
		if (hallucinations > 0) fail_types.push("REPETITION_LOOP");
		if (speakerSim < SPEAKER_THRESHOLD) fail_types.push("SPEAKER_DRIFT");
		if (silenceRatio > 0.12) fail_types.push("SILENCE_CORRUPTION");

		const status = fail_types.length > 0 ? "FAIL" : "PASS";

		let repair: RepairAction | undefined;
		if (fail_types.includes("SPEAKER_DRIFT")) repair = "refresh_reference";
		else if (fail_types.includes("SILENCE_CORRUPTION"))
			repair = "SILENCE_OR_TOO_SOFT";
		else if (fail_types.includes("REPETITION_LOOP")) repair = "ACOUSTIC_DAMAGE";
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
