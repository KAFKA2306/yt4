import { AuditTrace, FailType, RepairAction } from "../runtime/types";

/**
 * LLM Quality Judge
 * 
 * Rules:
 * 1. NO subjective impression.
 * 2. ONLY use deterministic verifier outputs.
 * 3. MAP results to fixed FAIL_TYPES and allowed REPAIR_ACTIONS.
 */
export class QualityJudge {
	async classify(trace: Partial<AuditTrace>): Promise<{
		status: "PASS" | "FAIL";
		fail_types: FailType[];
		repair_candidate?: RepairAction;
		confidence: number;
		evidence: string;
	}> {
		// Optimization: Gemini 3 Flash is used for classification.
		// System Prompt is hard-coded to prevent hallucinations.
		const metrics = trace.metrics;
		const prompt = `
[CONTEXT]
You are a Voice Quality Auditor. 
Classify the following TTS verification results into fixed FAIL_TYPES.

[METRICS]
- CER (Character Error Rate): ${metrics?.cer} (Goal: > 0.85)
- Hallucinations: ${metrics?.hallucinations} (Goal: 0)
- Speaker Similarity: ${metrics?.speaker_sim} (Goal: > 0.85)
- Silence Ratio: ${metrics?.silence_ratio} (Goal: < 0.12)

[TAXONOMY]
FAIL_TYPES: SPEAKER_DRIFT, LANGUAGE_COLLAPSE, LOW_INTELLIGIBILITY, PROSODY_FLAT, EMOTION_MISMATCH, REPETITION_LOOP, NOISE_CORRUPTION, SILENCE_CORRUPTION

REPAIR_ACTIONS: regenerate_chunk, split_chunk, shorten_context, refresh_reference, lower_temperature, rerun_alignment

[RULES]
- If CER < 0.85 -> LOW_INTELLIGIBILITY
- If hallucinations > 0 -> REPETITION_LOOP
- If speaker_sim < 0.85 -> SPEAKER_DRIFT
- If silence_ratio > 0.12 -> SILENCE_CORRUPTION

[OUTPUT FORMAT (JSON)]
{
  "status": "PASS" | "FAIL",
  "fail_types": ["TYPE1", "TYPE2"],
  "repair_candidate": "ACTION",
  "confidence": 0.0-1.0,
  "evidence": "Brief string explaining the worst metric"
}
`;

		// Mock implementation for now to keep it deterministic in this turn
		// In production, this calls Gemini 3 Flash.
		const fail_types: FailType[] = [];
		if ((metrics?.cer ?? 1) < 0.85) fail_types.push("LOW_INTELLIGIBILITY");
		if ((metrics?.hallucinations ?? 0) > 0) fail_types.push("REPETITION_LOOP");
		if ((metrics?.speaker_sim ?? 1) < 0.85) fail_types.push("SPEAKER_DRIFT");
		if ((metrics?.silence_ratio ?? 0) > 0.12) fail_types.push("SILENCE_CORRUPTION");

		const status = fail_types.length > 0 ? "FAIL" : "PASS";
		
		let repair: RepairAction | undefined;
		if (fail_types.includes("SPEAKER_DRIFT")) repair = "refresh_reference";
		else if (fail_types.includes("REPETITION_LOOP")) repair = "split_chunk";
		else if (fail_types.includes("LOW_INTELLIGIBILITY")) repair = "lower_temperature";

		return {
			status,
			fail_types,
			repair_candidate: repair,
			confidence: 1.0,
			evidence: fail_types.join(", "),
		};
	}
}
