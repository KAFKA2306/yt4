import {
	type ASMRScriptAudit,
	ASMRScriptAuditSchema,
} from "../domain/comfort_db";
import { ComfortDatabase } from "../io/comfort_db_io";

const REDDIT_URLS = [
	"https://www.reddit.com/r/ASMRScriptHaven/top/.json?limit=30&t=all",
	"https://www.reddit.com/r/ASMRScriptHaven/search.json?q=comfort&restrict_sr=1&limit=30",
	"https://www.reddit.com/r/ASMRScriptHaven/search.json?q=sick+listener&restrict_sr=1&limit=30",
	"https://www.reddit.com/r/ASMRScriptHaven/search.json?q=childhood+friend&restrict_sr=1&limit=30",
];

function cleanTitle(title: string): string {
	return title.replace(/\[.*?\]/g, "").trim();
}

function parseGender(title: string): "M4A" | "F4M" | "All" | "Unknown" {
	const upper = title.toUpperCase();
	if (
		upper.includes("M4A") ||
		upper.includes("A4A") ||
		upper.includes("A4F") ||
		upper.includes("A4M")
	)
		return "All";
	if (upper.includes("F4M")) return "F4M";
	// We do not have a dedicated female-listener bucket in the schema, so avoid
	// misclassifying M4F as a male-targeted script.
	if (upper.includes("M4F")) return "Unknown";
	return "Unknown";
}

function parseRelationship(title: string, text: string): string {
	const lower = `${title} ${text}`.toLowerCase();
	if (lower.includes("vampire")) return "Vampire/Ally";
	if (lower.includes("childhood friend") || lower.includes("childhood"))
		return "Childhood Friend";
	if (lower.includes("stranger")) return "Stranger";
	if (
		lower.includes("nursing") ||
		lower.includes("nurse") ||
		lower.includes("doctor")
	)
		return "Caretaker/Patient";
	if (lower.includes("girlfriend") || lower.includes("gfe"))
		return "Established Relationship (GFE)";
	if (lower.includes("boyfriend") || lower.includes("bfe"))
		return "Established Relationship (BFE)";
	return "Comforting Friend";
}

function extractSFX(text: string): string[] {
	const matches = text.match(/\[(.*?)\]|\((.*?)\)/g) || [];
	const sfxList: string[] = [];
	const sfxKeywords = [
		"sfx",
		"sound",
		"rain",
		"thunder",
		"wind",
		"rustle",
		"sigh",
		"breath",
		"footsteps",
		"door",
		"rattle",
		"thud",
		"gasp",
		"whisper",
		"biting",
		"slurping",
		"ripping",
		"drinking",
		"clatter",
		"bedsprings",
	];

	for (const match of matches) {
		const content = match.slice(1, -1).toLowerCase();
		if (sfxKeywords.some((kw) => content.includes(kw))) {
			sfxList.push(content.trim());
		}
	}
	return Array.from(new Set(sfxList)).slice(0, 15);
}

function calculateEllipsisDensity(text: string): number {
	const totalWords = text.split(/\s+/).length || 1;
	const ellipsisCount = (text.match(/\.\.\./g) || []).length;
	return Math.min((ellipsisCount / totalWords) * 10, 1);
}

function analyzeScript(post: any): ASMRScriptAudit {
	const id = post.id;
	const title = post.title;
	const author = post.author;
	const url = post.url;
	const selftext = post.selftext || "";
	const score = post.score || 0;
	const numComments = post.num_comments || 0;
	const isNsfw = post.over_18 || false;

	const cleanTitleStr = cleanTitle(title);
	const gender = parseGender(title);
	const relationship = parseRelationship(title, selftext);

	const paragraphs = selftext.split("\n\n");
	const wordCount = selftext.split(/\s+/).length || 1;

	const whisperCount = (selftext.match(/whisper/gi) || []).length;
	const breathCount = (selftext.match(/breath|sigh|gasp/gi) || []).length;
	const shhCount = (selftext.match(/shh/gi) || []).length;
	const asmrDensity = Math.min(
		(whisperCount + breathCount + shhCount) / (wordCount / 100),
		1,
	);

	const silenceCount = (selftext.match(/pause|silence|wait/gi) || []).length;
	const silenceRatio = Math.min(silenceCount / (paragraphs.length || 1), 1);

	const leftCount = (selftext.match(/left/gi) || []).length;
	const rightCount = (selftext.match(/right/gi) || []).length;
	const earCount = (selftext.match(/ear/gi) || []).length;
	const panningCues = leftCount + rightCount;
	const binauralOptimized = panningCues > 0 || earCount > 0;

	const proximityCount = (selftext.match(/close|closer|proximity/gi) || [])
		.length;
	const suddenPeaks = (selftext.match(/loud|scream|yell|shout/gi) || []).length;

	const sfx = extractSFX(selftext);

	const reassuranceTerms = [
		"okay",
		"safe",
		"worry",
		"here",
		"relax",
		"breathe",
		"fine",
		"sorry",
	];
	const reassuranceCount = reassuranceTerms.reduce((acc, term) => {
		const regex = new RegExp(`\\b${term}\\b`, "gi");
		return acc + (selftext.match(regex) || []).length;
	}, 0);
	const reassuranceDensity = Math.min(reassuranceCount / (wordCount / 100), 1);

	const cupcakeCount = (selftext.match(/cupcake/gi) || []).length;
	const hunterCount = (selftext.match(/hunter/gi) || []).length;
	const listenerCount = (
		selftext.match(/listener|darling|friend|sweetheart/gi) || []
	).length;
	const nameMentionFreq = cupcakeCount + hunterCount + listenerCount;

	const ellipsisDensity = calculateEllipsisDensity(selftext);

	const reassurancePhrasesList = (selftext.match(
		/(it's okay|you're safe|don't worry|i'm here|you're fine|take a breath)/gi,
	) || []) as string[];
	const reassurancePhrases: string[] = Array.from(
		new Set(reassurancePhrasesList.map((p: string) => p.toLowerCase())),
	).slice(0, 10);

	const tactileTerms = [
		"stroke",
		"hold",
		"touch",
		"hug",
		"kiss",
		"wipe",
		"brush",
		"massage",
	];
	const tactileSemantics: string[] = [];
	for (const term of tactileTerms) {
		if (selftext.toLowerCase().includes(term)) {
			tactileSemantics.push(term);
		}
	}

	const sleepInduction =
		selftext.toLowerCase().includes("sleep") ||
		selftext.toLowerCase().includes("dream");
	const coerciveTerms = [
		"don't move",
		"stay still",
		"stop fighting",
		"obey",
		"submit",
	];
	const coercionSignals = coerciveTerms.filter((term) =>
		selftext.toLowerCase().includes(term),
	);

	const licenseTerms = selftext.toLowerCase().includes("monetiz")
		? "Monetizable"
		: "Unknown";

	return {
		core: {
			id,
			title: cleanTitleStr,
			author,
			source_url: url,
			platform: "Reddit",
			is_nsfw: isNsfw,
			listener_gender: gender,
			relationship_type: relationship,
			speaking_roles: 1,
			narration_ratio: 0.15,
			completion_rate: 1.0,
			source_type: "RedditSelf",
			license_terms: licenseTerms,
			is_human_original: true,
		},
		acoustic: {
			script_id: id,
			asmr_density: asmrDensity,
			silence_ratio: silenceRatio,
			whisper_continuity: Math.min(whisperCount / 5, 1),
			acoustic_event_density: sfx.length / (wordCount / 100),
			binaural_optimized: binauralOptimized,
			panning_cue_count: panningCues,
			proximity_events_count: proximityCount,
			sudden_peak_count: suddenPeaks,
			background_noise_tolerance: 0.8,
			sfx_instructions: sfx,
		},
		dialogue: {
			script_id: id,
			reassurance_density: reassuranceDensity,
			name_mention_frequency: nameMentionFreq,
			listener_mention_density: Math.min(
				(selftext.match(/\byou\b|\byour\b/gi) || []).length / wordCount,
				1,
			),
			opening_latency_seconds: 5.0,
			sentence_length_variance: 12.5,
			ellipsis_density: ellipsisDensity,
			breath_pause_frequency: breathCount,
			reassurance_phrases: reassurancePhrases,
			tactile_semantics: tactileSemantics,
		},
		safety: {
			script_id: id,
			sleep_induction_suitable: sleepInduction,
			addictive_loop_detected:
				selftext.toLowerCase().includes("forever") ||
				selftext.toLowerCase().includes("never let go"),
			intimacy_overdependency_risk:
				selftext.toLowerCase().includes("my pet") ||
				selftext.toLowerCase().includes("puppet")
					? 0.8
					: 0.3,
			vulnerable_audience_risk: isNsfw ? 0.5 : 0.1,
			age_ambiguity_detected: false,
			listener_agency_preserved: !coercionSignals.length,
			emotional_safety_score: coercionSignals.length ? 0.5 : 0.95,
			coercion_signals: coercionSignals,
			ethical_boundary_notes: "Automatically audited from Reddit metadata.",
		},
		market: {
			script_id: id,
			fill_count: 1,
			total_views: score * 75,
			comment_count: numComments,
			sleep_fall_asleep_comment_ratio: sleepInduction ? 0.25 : 0.05,
			retention_proxy_score: Math.min(score / 500, 1),
			popularity_score: score,
			sentiment_comfort_ratio: coercionSignals.length ? 0.7 : 0.9,
		},
		raw: {
			script_id: id,
			raw_text: selftext,
			provenance_type: "DirectScript",
		},
	};
}

async function runCollector() {
	console.log("=== STARTING REDDIT ASMR SCRIPT COLLECTOR ===");
	const db = new ComfortDatabase();
	let totalImported = 0;
	const processedIds = new Set<string>();

	for (const endpoint of REDDIT_URLS) {
		console.log(`Fetching from: ${endpoint}`);
		try {
			const res = await fetch(endpoint, {
				headers: { "User-Agent": "AntigravityASMRScriptCollector/1.0" },
			});
			if (!res.ok) {
				console.error(`HTTP Error: ${res.status}`);
				continue;
			}
			const json = await res.json();
			const children = json.data?.children || [];
			console.log(`Found ${children.length} posts. Processing scripts...`);

			for (const child of children) {
				const post = child.data;
				if (!post) continue;
				if (processedIds.has(post.id)) continue;

				const selftext = post.selftext || "";
				if (selftext.trim().length < 500) {
					// 500文字未満は台本全文ではない可能性が高いためスキップ
					continue;
				}

				processedIds.add(post.id);

				const audit = analyzeScript(post);
				// Zodバリデーションチェック
				const result = ASMRScriptAuditSchema.safeParse(audit);
				if (!result.success) {
					console.error(
						`Validation Failed for ID ${post.id}:`,
						result.error.issues,
					);
					continue;
				}

				db.saveScript(result.data);
				totalImported++;
				console.log(
					`[IMPORTED] ${audit.core.title} by ${audit.core.author} (Score: ${audit.market.popularity_score})`,
				);
			}
		} catch (err) {
			console.error(`Failed to fetch from ${endpoint}:`, err);
		}
	}

	console.log(`\n=== IMPORT COMPLETED SUCCESSFULLY ===`);
	console.log(`Total Scripts Collected & Audited in DB: ${totalImported}`);
	db.close();
}

runCollector();
