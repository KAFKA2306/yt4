import { z } from "zod";

export const EmotionalStateSchema = z.object({
	valence: z.number().min(-1).max(1),
	arousal: z.number().min(0).max(1),
	softness: z.number().min(0).max(1),
	atmosphere: z.string(),
});
export type EmotionalState = z.infer<typeof EmotionalStateSchema>;

export const EmotionalMemorySchema = z.object({
	history: z.array(
		z.object({
			timestamp: z.string(),
			state: EmotionalStateSchema,
			trigger: z.string().optional(),
		}),
	),
	persistent_mood: EmotionalStateSchema,
	drift_score: z.number().default(0),
});
export type EmotionalMemory = z.infer<typeof EmotionalMemorySchema>;

export const IdentityContractSchema = z.object({
	id: z.string(),
	name: z.string(),
	voice_id: z.string(),
	pacing_base: z.number().default(1.0),
	hesitation_frequency: z.number().min(0).max(1).default(0.1),
	breathing_frequency: z.number().min(0).max(1).default(0.2),
	preferred_atmosphere: z.string().default("late-night"),
	invariants: z
		.object({
			max_arousal: z.number().default(0.4),
			min_softness: z.number().default(0.6),
			max_emotion_delta: z.number().default(0.1),
			max_pressure_delta: z.number().default(0.2),
			min_silence_density: z.number().default(0.3),
		})
		.default({
			max_arousal: 0.4,
			min_softness: 0.6,
			max_emotion_delta: 0.1,
			max_pressure_delta: 0.2,
			min_silence_density: 0.3,
		}),
});
export type IdentityContract = z.infer<typeof IdentityContractSchema>;

export const SceneStateSchema = z.object({
	ambience_type: z.string(),
	ambience_intensity: z.number().min(0).max(1),
	proximity: z.enum(["intimate", "near", "medium", "far"]),
	posture: z.string().optional(),
	silence_density: z.number().min(0).max(1),
	room_pressure: z.number().min(0).max(1),
});
export type SceneState = z.infer<typeof SceneStateSchema>;

export const ScriptLineSchema = z.object({
	text: z.string(),
	emotion: EmotionalStateSchema.optional(),
	scene: SceneStateSchema.optional(),
	pause_after: z.number().default(0),
	metadata: z.record(z.string(), z.any()).optional(),
});
export type ScriptLine = z.infer<typeof ScriptLineSchema>;

export const ResonanceStateSchema = z.object({
	session_id: z.string(),
	identity: IdentityContractSchema,
	current_emotion: EmotionalStateSchema,
	current_scene: SceneStateSchema,
	memory: EmotionalMemorySchema,
	status: z
		.enum(["idle", "generating", "speaking", "repairing", "error"])
		.default("idle"),
});
export type ResonanceState = z.infer<typeof ResonanceStateSchema>;

export const LifeLogTripleSchema = z.object({
	subject: z.string(),
	predicate: z.string(),
	object: z.string(),
	_source: z.string().optional(),
	timestamp: z.string().optional(),
});
export type LifeLogTriple = z.infer<typeof LifeLogTripleSchema>;

export const LifeLogSchema = z.object({
	triples: z.array(LifeLogTripleSchema),
});
export type LifeLog = z.infer<typeof LifeLogSchema>;

export interface MetricEvent {
	type: string;
	status: string;
	message?: string;
	timestamp: number;
}
