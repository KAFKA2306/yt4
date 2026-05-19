import { z } from "zod";

export const ScriptCoreSchema = z.object({
	id: z.string(),
	title: z.string(),
	author: z.string(),
	source_url: z.string().url(),
	published_date: z.string().optional(),
	platform: z.string(),
	is_nsfw: z.boolean(),
	listener_gender: z.enum(["M4A", "F4M", "All", "Unknown"]),
	relationship_type: z.string(),
	speaking_roles: z.number().int().default(1),
	narration_ratio: z.number().min(0).max(1),
	completion_rate: z.number().min(0).max(1),
	source_type: z.enum(["PDF", "Docs", "RedditSelf", "Scriptbin", "Other"]),
	license_terms: z.string().default("Unknown"),
	is_human_original: z.boolean().default(true)
});

export const AcousticFeatureSchema = z.object({
	script_id: z.string(),
	asmr_density: z.number().min(0).max(1),
	silence_ratio: z.number().min(0).max(1),
	whisper_continuity: z.number().min(0).max(1),
	acoustic_event_density: z.number().min(0),
	binaural_optimized: z.boolean(),
	panning_cue_count: z.number().int().nonnegative(),
	proximity_events_count: z.number().int().nonnegative(),
	sudden_peak_count: z.number().int().nonnegative(),
	background_noise_tolerance: z.number().min(0).max(1),
	sfx_instructions: z.array(z.string()).default([])
});

export const DialogueFeatureSchema = z.object({
	script_id: z.string(),
	reassurance_density: z.number().min(0).max(1),
	name_mention_frequency: z.number().nonnegative(),
	listener_mention_density: z.number().min(0).max(1),
	opening_latency_seconds: z.number().nonnegative(),
	sentence_length_variance: z.number().nonnegative(),
	ellipsis_density: z.number().min(0).max(1),
	breath_pause_frequency: z.number().nonnegative(),
	reassurance_phrases: z.array(z.string()).default([]),
	tactile_semantics: z.array(z.string()).default([])
});

export const SafetyAuditSchema = z.object({
	script_id: z.string(),
	sleep_induction_suitable: z.boolean(),
	addictive_loop_detected: z.boolean(),
	intimacy_overdependency_risk: z.number().min(0).max(1),
	vulnerable_audience_risk: z.number().min(0).max(1),
	age_ambiguity_detected: z.boolean(),
	listener_agency_preserved: z.boolean(),
	emotional_safety_score: z.number().min(0).max(1),
	coercion_signals: z.array(z.string()).default([]),
	ethical_boundary_notes: z.string().optional()
});

export const MarketMetricSchema = z.object({
	script_id: z.string(),
	fill_count: z.number().int().nonnegative(),
	total_views: z.number().int().nonnegative(),
	comment_count: z.number().int().nonnegative(),
	sleep_fall_asleep_comment_ratio: z.number().min(0).max(1),
	retention_proxy_score: z.number().min(0).max(1),
	popularity_score: z.number().nonnegative(),
	sentiment_comfort_ratio: z.number().min(0).max(1)
});

export const RawScriptSchema = z.object({
	script_id: z.string(),
	raw_text: z.string(),
	asr_transcript: z.string().optional(),
	character_error_rate: z.number().min(0).max(1).optional(),
	provenance_type: z.enum(["DirectScript", "AsrTranscription", "Hybrid"]),
	temporal_structure_embedding: z.array(z.number()).optional()
});

export const ASMRScriptAuditSchema = z.object({
	core: ScriptCoreSchema,
	acoustic: AcousticFeatureSchema,
	dialogue: DialogueFeatureSchema,
	safety: SafetyAuditSchema,
	market: MarketMetricSchema,
	raw: RawScriptSchema
});

export type ScriptCore = z.infer<typeof ScriptCoreSchema>;
export type AcousticFeature = z.infer<typeof AcousticFeatureSchema>;
export type DialogueFeature = z.infer<typeof DialogueFeatureSchema>;
export type SafetyAudit = z.infer<typeof SafetyAuditSchema>;
export type MarketMetric = z.infer<typeof MarketMetricSchema>;
export type RawScript = z.infer<typeof RawScriptSchema>;
export type ASMRScriptAudit = z.infer<typeof ASMRScriptAuditSchema>;
