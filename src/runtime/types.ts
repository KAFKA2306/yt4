import { z } from "zod";

export const EmotionalStateSchema = z.object({
	valence: z.number().min(-1).max(1),
	arousal: z.number().min(0).max(1),
	softness: z.number().min(0).max(1),
	atmosphere: z.string(),
});
export type EmotionalState = z.infer<typeof EmotionalStateSchema>;

export const IdentityContractSchema = z.object({
	id: z.string(),
	name: z.string(),
	voice_id: z.string(),
	preferred_atmosphere: z.string().default("late-night"),
	invariants: z
		.object({
			max_arousal: z.number().default(0.4),
			min_softness: z.number().default(0.6),
			max_emotion_delta: z.number().default(0.1),
		})
		.default({
			max_arousal: 0.4,
			min_softness: 0.6,
			max_emotion_delta: 0.1,
		}),
});
export type IdentityContract = z.infer<typeof IdentityContractSchema>;

export const ScriptLineSchema = z.object({
	text: z.string(),
	emotion: EmotionalStateSchema.optional(),
	pause_after: z.number().default(5),
});
export type ScriptLine = z.infer<typeof ScriptLineSchema>;

export type FailType =
	| "SPEAKER_DRIFT"
	| "LANGUAGE_COLLAPSE"
	| "LOW_INTELLIGIBILITY"
	| "PROSODY_FLAT"
	| "EMOTION_MISMATCH"
	| "REPETITION_LOOP"
	| "NOISE_CORRUPTION"
	| "SILENCE_CORRUPTION";

export type RepairAction =
	| "regenerate_chunk"
	| "split_chunk"
	| "shorten_context"
	| "refresh_reference"
	| "lower_temperature"
	| "rerun_alignment";

export const AuditTraceSchema = z.object({
	timestamp: z.string(),
	assetId: z.string(),
	sessionId: z.string(),
	chunkIndex: z.number(),
	wavHash: z.string(),
	promptHash: z.string(),
	seed: z.number(),
	metrics: z.object({
		cer: z.number(),
		hallucinations: z.number(),
		f0: z.number().optional(),
		energy: z.number().optional(),
		speaker_sim: z.number().optional(),
		silence_ratio: z.number().optional(),
	}),
	transcription: z.string().optional(),
	status: z.enum(["PASS", "FAIL"]),
	fail_types: z.array(z.string()).optional(),
	selected_action: z.string().optional(),
	retry_count: z.number().optional(),
});
export type AuditTrace = z.infer<typeof AuditTraceSchema>;

export interface ProductionConfig {
	identity: {
		id: string;
		name: string;
		voice_id: string;
		overrides?: any;
	};
	script_path: string;
	image_path: string;
	runtime: {
		chunk_length: number;
		seed_base: number;
		max_retries: number;
	};
}

export interface LifeLogTriple {
	subject: string;
	predicate: string;
	object: string;
	timestamp: string;
}

export const LifeLogTripleSchema = z.object({
	subject: z.string(),
	predicate: z.string(),
	object: z.string(),
	timestamp: z.string(),
});
