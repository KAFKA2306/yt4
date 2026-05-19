import { Database } from "bun:sqlite";
import type {
	ASMRScriptAudit,
	ScriptCore,
	AcousticFeature,
	DialogueFeature,
	SafetyAudit,
	MarketMetric,
	RawScript,
	InteractionPrimitive,
	SleepRiskAudit
} from "../domain/comfort_db";


export class ComfortDatabase {
	private db: Database;

	constructor(dbPath = "data/comfort_interface.db") {
		this.db = new Database(dbPath, { create: true });
		this.initializeTables();
	}

	private initializeTables(): void {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS scripts_core (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				author TEXT NOT NULL,
				source_url TEXT NOT NULL,
				published_date TEXT,
				platform TEXT NOT NULL,
				is_nsfw INTEGER NOT NULL,
				listener_gender TEXT NOT NULL,
				relationship_type TEXT NOT NULL,
				speaking_roles INTEGER NOT NULL,
				narration_ratio REAL NOT NULL,
				completion_rate REAL NOT NULL,
				source_type TEXT NOT NULL,
				license_terms TEXT NOT NULL,
				is_human_original INTEGER NOT NULL
			);
		`);

		this.db.run(`
			CREATE TABLE IF NOT EXISTS acoustic_features (
				script_id TEXT PRIMARY KEY,
				asmr_density REAL NOT NULL,
				silence_ratio REAL NOT NULL,
				whisper_continuity REAL NOT NULL,
				acoustic_event_density REAL NOT NULL,
				binaural_optimized INTEGER NOT NULL,
				panning_cue_count INTEGER NOT NULL,
				proximity_events_count INTEGER NOT NULL,
				sudden_peak_count INTEGER NOT NULL,
				background_noise_tolerance REAL NOT NULL,
				sfx_instructions TEXT NOT NULL,
				FOREIGN KEY(script_id) REFERENCES scripts_core(id)
			);
		`);

		this.db.run(`
			CREATE TABLE IF NOT EXISTS dialogue_features (
				script_id TEXT PRIMARY KEY,
				reassurance_density REAL NOT NULL,
				name_mention_frequency REAL NOT NULL,
				listener_mention_density REAL NOT NULL,
				opening_latency_seconds REAL NOT NULL,
				sentence_length_variance REAL NOT NULL,
				ellipsis_density REAL NOT NULL,
				breath_pause_frequency REAL NOT NULL,
				reassurance_phrases TEXT NOT NULL,
				tactile_semantics TEXT NOT NULL,
				FOREIGN KEY(script_id) REFERENCES scripts_core(id)
			);
		`);

		this.db.run(`
			CREATE TABLE IF NOT EXISTS safety_audits (
				script_id TEXT PRIMARY KEY,
				sleep_induction_suitable INTEGER NOT NULL,
				addictive_loop_detected INTEGER NOT NULL,
				intimacy_overdependency_risk REAL NOT NULL,
				vulnerable_audience_risk REAL NOT NULL,
				age_ambiguity_detected INTEGER NOT NULL,
				listener_agency_preserved INTEGER NOT NULL,
				emotional_safety_score REAL NOT NULL,
				coercion_signals TEXT NOT NULL,
				ethical_boundary_notes TEXT,
				FOREIGN KEY(script_id) REFERENCES scripts_core(id)
			);
		`);

		this.db.run(`
			CREATE TABLE IF NOT EXISTS market_metrics (
				script_id TEXT PRIMARY KEY,
				fill_count INTEGER NOT NULL,
				total_views INTEGER NOT NULL,
				comment_count INTEGER NOT NULL,
				sleep_fall_asleep_comment_ratio REAL NOT NULL,
				retention_proxy_score REAL NOT NULL,
				popularity_score REAL NOT NULL,
				sentiment_comfort_ratio REAL NOT NULL,
				FOREIGN KEY(script_id) REFERENCES scripts_core(id)
			);
		`);

		this.db.run(`
			CREATE TABLE IF NOT EXISTS raw_scripts (
				script_id TEXT PRIMARY KEY,
				raw_text TEXT NOT NULL,
				asr_transcript TEXT,
				character_error_rate REAL,
				provenance_type TEXT NOT NULL,
				temporal_structure_embedding TEXT,
				FOREIGN KEY(script_id) REFERENCES scripts_core(id)
			);
		`);

		this.db.run(`
			CREATE TABLE IF NOT EXISTS interaction_primitives (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				script_id TEXT NOT NULL,
				sequence_index INTEGER NOT NULL,
				archetype TEXT NOT NULL,
				raw_text TEXT NOT NULL,
				silence_duration REAL NOT NULL,
				FOREIGN KEY(script_id) REFERENCES scripts_core(id)
			);
		`);

		this.db.run(`
			CREATE TABLE IF NOT EXISTS sleep_risk_audits (
				script_id TEXT PRIMARY KEY,
				sleep_interruption_risk REAL NOT NULL,
				auditory_overstimulation REAL NOT NULL,
				emotional_dependency_risk REAL NOT NULL,
				repeat_listening_tolerance REAL NOT NULL,
				FOREIGN KEY(script_id) REFERENCES scripts_core(id)
			);
		`);
	}


	public saveScript(audit: ASMRScriptAudit): void {
		const tx = this.db.transaction(() => {
			this.saveCore(audit.core);
			this.saveAcoustic(audit.acoustic);
			this.saveDialogue(audit.dialogue);
			this.saveSafety(audit.safety);
			this.saveMarket(audit.market);
			this.saveRaw(audit.raw);
			if (audit.primitives) {
				this.savePrimitives(audit.core.id, audit.primitives);
			}
			if (audit.sleep_risk) {
				this.saveSleepRisk(audit.sleep_risk);
			}
		});
		tx();
	}


	private saveCore(core: ScriptCore): void {
		this.db.run(
			`
			INSERT OR REPLACE INTO scripts_core (
				id, title, author, source_url, published_date, platform, is_nsfw,
				listener_gender, relationship_type, speaking_roles, narration_ratio,
				completion_rate, source_type, license_terms, is_human_original
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				core.id,
				core.title,
				core.author,
				core.source_url,
				core.published_date ?? null,
				core.platform,
				core.is_nsfw ? 1 : 0,
				core.listener_gender,
				core.relationship_type,
				core.speaking_roles,
				core.narration_ratio,
				core.completion_rate,
				core.source_type,
				core.license_terms,
				core.is_human_original ? 1 : 0
			]
		);
	}

	private saveAcoustic(acoustic: AcousticFeature): void {
		this.db.run(
			`
			INSERT OR REPLACE INTO acoustic_features (
				script_id, asmr_density, silence_ratio, whisper_continuity,
				acoustic_event_density, binaural_optimized, panning_cue_count,
				proximity_events_count, sudden_peak_count, background_noise_tolerance,
				sfx_instructions
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				acoustic.script_id,
				acoustic.asmr_density,
				acoustic.silence_ratio,
				acoustic.whisper_continuity,
				acoustic.acoustic_event_density,
				acoustic.binaural_optimized ? 1 : 0,
				acoustic.panning_cue_count,
				acoustic.proximity_events_count,
				acoustic.sudden_peak_count,
				acoustic.background_noise_tolerance,
				JSON.stringify(acoustic.sfx_instructions)
			]
		);
	}

	private saveDialogue(dialogue: DialogueFeature): void {
		this.db.run(
			`
			INSERT OR REPLACE INTO dialogue_features (
				script_id, reassurance_density, name_mention_frequency, listener_mention_density,
				opening_latency_seconds, sentence_length_variance, ellipsis_density,
				breath_pause_frequency, reassurance_phrases, tactile_semantics
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				dialogue.script_id,
				dialogue.reassurance_density,
				dialogue.name_mention_frequency,
				dialogue.listener_mention_density,
				dialogue.opening_latency_seconds,
				dialogue.sentence_length_variance,
				dialogue.ellipsis_density,
				dialogue.breath_pause_frequency,
				JSON.stringify(dialogue.reassurance_phrases),
				JSON.stringify(dialogue.tactile_semantics)
			]
		);
	}

	private saveSafety(safety: SafetyAudit): void {
		this.db.run(
			`
			INSERT OR REPLACE INTO safety_audits (
				script_id, sleep_induction_suitable, addictive_loop_detected,
				intimacy_overdependency_risk, vulnerable_audience_risk, age_ambiguity_detected,
				listener_agency_preserved, emotional_safety_score, coercion_signals,
				ethical_boundary_notes
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				safety.script_id,
				safety.sleep_induction_suitable ? 1 : 0,
				safety.addictive_loop_detected ? 1 : 0,
				safety.intimacy_overdependency_risk,
				safety.vulnerable_audience_risk,
				safety.age_ambiguity_detected ? 1 : 0,
				safety.listener_agency_preserved ? 1 : 0,
				safety.emotional_safety_score,
				JSON.stringify(safety.coercion_signals),
				safety.ethical_boundary_notes ?? null
			]
		);
	}

	private saveMarket(market: MarketMetric): void {
		this.db.run(
			`
			INSERT OR REPLACE INTO market_metrics (
				script_id, fill_count, total_views, comment_count,
				sleep_fall_asleep_comment_ratio, retention_proxy_score,
				popularity_score, sentiment_comfort_ratio
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`,
			[
				market.script_id,
				market.fill_count,
				market.total_views,
				market.comment_count,
				market.sleep_fall_asleep_comment_ratio,
				market.retention_proxy_score,
				market.popularity_score,
				market.sentiment_comfort_ratio
			]
		);
	}

	private saveRaw(raw: RawScript): void {
		this.db.run(
			`
			INSERT OR REPLACE INTO raw_scripts (
				script_id, raw_text, asr_transcript, character_error_rate,
				provenance_type, temporal_structure_embedding
			) VALUES (?, ?, ?, ?, ?, ?)
			`,
			[
				raw.script_id,
				raw.raw_text,
				raw.asr_transcript ?? null,
				raw.character_error_rate ?? null,
				raw.provenance_type,
				raw.temporal_structure_embedding ? JSON.stringify(raw.temporal_structure_embedding) : null
			]
		);
	}

	private savePrimitives(scriptId: string, primitives: InteractionPrimitive[]): void {
		this.db.run("DELETE FROM interaction_primitives WHERE script_id = ?", [scriptId]);
		for (const p of primitives) {
			this.db.run(
				`
				INSERT INTO interaction_primitives (
					script_id, sequence_index, archetype, raw_text, silence_duration
				) VALUES (?, ?, ?, ?, ?)
				`,
				[
					scriptId,
					p.sequence_index,
					p.archetype,
					p.raw_text,
					p.silence_duration
				]
			);
		}
	}

	private saveSleepRisk(risk: SleepRiskAudit): void {
		this.db.run(
			`
			INSERT OR REPLACE INTO sleep_risk_audits (
				script_id, sleep_interruption_risk, auditory_overstimulation,
				emotional_dependency_risk, repeat_listening_tolerance
			) VALUES (?, ?, ?, ?, ?)
			`,
			[
				risk.script_id,
				risk.sleep_interruption_risk,
				risk.auditory_overstimulation,
				risk.emotional_dependency_risk,
				risk.repeat_listening_tolerance
			]
		);
	}


	public getScript(id: string): ASMRScriptAudit | null {
		const coreRow = this.db.query("SELECT * FROM scripts_core WHERE id = ?").get(id) as any;
		if (!coreRow) return null;

		const acousticRow = this.db.query("SELECT * FROM acoustic_features WHERE script_id = ?").get(id) as any;
		const dialogueRow = this.db.query("SELECT * FROM dialogue_features WHERE script_id = ?").get(id) as any;
		const safetyRow = this.db.query("SELECT * FROM safety_audits WHERE script_id = ?").get(id) as any;
		const marketRow = this.db.query("SELECT * FROM market_metrics WHERE script_id = ?").get(id) as any;
		const rawRow = this.db.query("SELECT * FROM raw_scripts WHERE script_id = ?").get(id) as any;

		const primitiveRows = this.db.query("SELECT * FROM interaction_primitives WHERE script_id = ? ORDER BY sequence_index ASC").all(id) as any[];
		const primitives: InteractionPrimitive[] = primitiveRows.map(r => ({
			id: r.id.toString(),
			script_id: r.script_id,
			sequence_index: r.sequence_index,
			archetype: r.archetype as any,
			raw_text: r.raw_text,
			silence_duration: r.silence_duration
		}));

		const sleepRiskRow = this.db.query("SELECT * FROM sleep_risk_audits WHERE script_id = ?").get(id) as any;
		const sleepRisk: SleepRiskAudit | undefined = sleepRiskRow ? {
			script_id: sleepRiskRow.script_id,
			sleep_interruption_risk: sleepRiskRow.sleep_interruption_risk,
			auditory_overstimulation: sleepRiskRow.auditory_overstimulation,
			emotional_dependency_risk: sleepRiskRow.emotional_dependency_risk,
			repeat_listening_tolerance: sleepRiskRow.repeat_listening_tolerance
		} : undefined;

		return {
			core: {
				id: coreRow.id,
				title: coreRow.title,
				author: coreRow.author,
				source_url: coreRow.source_url,
				published_date: coreRow.published_date ?? undefined,
				platform: coreRow.platform,
				is_nsfw: coreRow.is_nsfw === 1,
				listener_gender: coreRow.listener_gender,
				relationship_type: coreRow.relationship_type,
				speaking_roles: coreRow.speaking_roles,
				narration_ratio: coreRow.narration_ratio,
				completion_rate: coreRow.completion_rate,
				source_type: coreRow.source_type,
				license_terms: coreRow.license_terms,
				is_human_original: coreRow.is_human_original === 1
			},
			acoustic: {
				script_id: acousticRow.script_id,
				asmr_density: acousticRow.asmr_density,
				silence_ratio: acousticRow.silence_ratio,
				whisper_continuity: acousticRow.whisper_continuity,
				acoustic_event_density: acousticRow.acoustic_event_density,
				binaural_optimized: acousticRow.binaural_optimized === 1,
				panning_cue_count: acousticRow.panning_cue_count,
				proximity_events_count: acousticRow.proximity_events_count,
				sudden_peak_count: acousticRow.sudden_peak_count,
				background_noise_tolerance: acousticRow.background_noise_tolerance,
				sfx_instructions: JSON.parse(acousticRow.sfx_instructions)
			},
			dialogue: {
				script_id: dialogueRow.script_id,
				reassurance_density: dialogueRow.reassurance_density,
				name_mention_frequency: dialogueRow.name_mention_frequency,
				listener_mention_density: dialogueRow.listener_mention_density,
				opening_latency_seconds: dialogueRow.opening_latency_seconds,
				sentence_length_variance: dialogueRow.sentence_length_variance,
				ellipsis_density: dialogueRow.ellipsis_density,
				breath_pause_frequency: dialogueRow.breath_pause_frequency,
				reassurance_phrases: JSON.parse(dialogueRow.reassurance_phrases),
				tactile_semantics: JSON.parse(dialogueRow.tactile_semantics)
			},
			safety: {
				script_id: safetyRow.script_id,
				sleep_induction_suitable: safetyRow.sleep_induction_suitable === 1,
				addictive_loop_detected: safetyRow.addictive_loop_detected === 1,
				intimacy_overdependency_risk: safetyRow.intimacy_overdependency_risk,
				vulnerable_audience_risk: safetyRow.vulnerable_audience_risk,
				age_ambiguity_detected: safetyRow.age_ambiguity_detected === 1,
				listener_agency_preserved: safetyRow.listener_agency_preserved === 1,
				emotional_safety_score: safetyRow.emotional_safety_score,
				coercion_signals: JSON.parse(safetyRow.coercion_signals),
				ethical_boundary_notes: safetyRow.ethical_boundary_notes ?? undefined
			},
			market: {
				script_id: marketRow.script_id,
				fill_count: marketRow.fill_count,
				total_views: marketRow.total_views,
				comment_count: marketRow.comment_count,
				sleep_fall_asleep_comment_ratio: marketRow.sleep_fall_asleep_comment_ratio,
				retention_proxy_score: marketRow.retention_proxy_score,
				popularity_score: marketRow.popularity_score,
				sentiment_comfort_ratio: marketRow.sentiment_comfort_ratio
			},
			raw: {
				script_id: rawRow.script_id,
				raw_text: rawRow.raw_text,
				asr_transcript: rawRow.asr_transcript ?? undefined,
				character_error_rate: rawRow.character_error_rate ?? undefined,
				provenance_type: rawRow.provenance_type,
				temporal_structure_embedding: rawRow.temporal_structure_embedding
					? JSON.parse(rawRow.temporal_structure_embedding)
					: undefined
			},
			primitives: primitives.length > 0 ? primitives : undefined,
			sleep_risk: sleepRisk
		};

	}

	public close(): void {
		this.db.close();
	}
}
