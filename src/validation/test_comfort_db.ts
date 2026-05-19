import { ASMRScriptAuditSchema, type ASMRScriptAudit } from "../domain/comfort_db";
import { ComfortDatabase } from "../io/comfort_db_io";

const testData: ASMRScriptAudit = {
	core: {
		id: "test-01",
		title: "テスト用おっとり幼馴染の看病ASMR",
		author: "琴音",
		source_url: "https://example.com/test-script",
		published_date: "2026-05-19",
		platform: "DLsite",
		is_nsfw: false,
		listener_gender: "M4A",
		relationship_type: "ChildhoodFriend",
		speaking_roles: 1,
		narration_ratio: 0.1,
		completion_rate: 1.0,
		source_type: "Docs",
		license_terms: "CC-BY",
		is_human_original: true
	},
	acoustic: {
		script_id: "test-01",
		asmr_density: 0.8,
		silence_ratio: 0.3,
		whisper_continuity: 0.9,
		acoustic_event_density: 1.5,
		binaural_optimized: true,
		panning_cue_count: 5,
		proximity_events_count: 3,
		sudden_peak_count: 0,
		background_noise_tolerance: 0.7,
		sfx_instructions: ["water_dripping", "cloth_rubbing"]
	},
	dialogue: {
		script_id: "test-01",
		reassurance_density: 0.85,
		name_mention_frequency: 4.2,
		listener_mention_density: 0.6,
		opening_latency_seconds: 15.0,
		sentence_length_variance: 25.5,
		ellipsis_density: 0.4,
		breath_pause_frequency: 3.5,
		reassurance_phrases: ["大丈夫だよ", "ここにいるからね", "よしよし"],
		tactile_semantics: ["看病", "おでこピタ", "呼吸", "布"]
	},
	safety: {
		script_id: "test-01",
		sleep_induction_suitable: true,
		addictive_loop_detected: false,
		intimacy_overdependency_risk: 0.3,
		vulnerable_audience_risk: 0.2,
		age_ambiguity_detected: false,
		listener_agency_preserved: true,
		emotional_safety_score: 0.95,
		coercion_signals: [],
		ethical_boundary_notes: "完全全年齢向け、極めて安全なケアプロトコル"
	},
	market: {
		script_id: "test-01",
		fill_count: 12,
		total_views: 150000,
		comment_count: 450,
		sleep_fall_asleep_comment_ratio: 0.35,
		retention_proxy_score: 0.88,
		popularity_score: 92.5,
		sentiment_comfort_ratio: 0.96
	},
	raw: {
		script_id: "test-01",
		raw_text: "（扉が静かに開く音）入るよ〜？……やっぱり、すごくしんどそうだね……。おでこ、冷やそうね。",
		provenance_type: "DirectScript"
	},
	primitives: [
		{
			script_id: "test-01",
			sequence_index: 0,
			archetype: "listener_status_check",
			raw_text: "やっぱり、すごくしんどそうだね……。",
			silence_duration: 6.0
		},
		{
			script_id: "test-01",
			sequence_index: 1,
			archetype: "tactile_reassurance",
			raw_text: "おでこ、冷やそうね。",
			silence_duration: 8.0
		}
	],
	sleep_risk: {
		script_id: "test-01",
		sleep_interruption_risk: 0.05,
		auditory_overstimulation: 0.1,
		emotional_dependency_risk: 0.25,
		repeat_listening_tolerance: 0.95
	}
};

const parsed = ASMRScriptAuditSchema.parse(testData);

const db = new ComfortDatabase("data/comfort_interface_test.db");
db.saveScript(parsed);

const retrieved = db.getScript("test-01");
if (!retrieved) {
	throw new Error("Failed to retrieve script from database");
}

const parsedRetrieved = ASMRScriptAuditSchema.parse(retrieved);

if (parsedRetrieved.core.title !== testData.core.title) {
	throw new Error("Title mismatch");
}

if (!parsedRetrieved.primitives || parsedRetrieved.primitives.length !== 2) {
	throw new Error("Interaction primitives retrieval mismatch");
}

if (parsedRetrieved.primitives[0].archetype !== "listener_status_check") {
	throw new Error("Interaction primitives archetype mismatch");
}

if (!parsedRetrieved.sleep_risk || parsedRetrieved.sleep_risk.sleep_interruption_risk !== 0.05) {
	throw new Error("Sleep risk audit metrics mismatch");
}

console.log("DATABASE TEST PASSED SUCCESSFULLY - ALL HCI 2.0 TABLES VALIDATED");
db.close();
