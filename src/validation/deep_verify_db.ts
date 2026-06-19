import { Database } from "bun:sqlite";

console.log("=== DEEP DATABASE VALIDATION & STATISTICAL AUDIT ===");

const db = new Database("data/comfort_interface.db", { readonly: true });

// 1. 基本集計
const totalCount = db
	.query("SELECT COUNT(*) as count FROM scripts_core")
	.get() as any;
const nsfwCount = db
	.query("SELECT COUNT(*) as count FROM scripts_core WHERE is_nsfw = 1")
	.get() as any;
const sfwCount = db
	.query("SELECT COUNT(*) as count FROM scripts_core WHERE is_nsfw = 0")
	.get() as any;
const scriptTotal = Number(totalCount?.count || 0);

console.log(`\n[1. Basic Volumetrics]`);
console.log(`- Total Unique Scripts Collected: ${scriptTotal}`);
console.log(`- SFW (Safe For Work) Scripts:    ${sfwCount?.count || 0}`);
console.log(`- NSFW Scripts:                  ${nsfwCount?.count || 0}`);

// 2. プラットフォーム & ソース種別
console.log(`\n[2. Source Platforms]`);
const platforms = db
	.query(
		"SELECT platform, COUNT(*) as count FROM scripts_core GROUP BY platform",
	)
	.all() as any[];
for (const p of platforms) {
	console.log(`- ${p.platform}: ${p.count} scripts`);
}

// 3. 関係性タイプ (Relationship Types) の分布
console.log(`\n[3. Relationship Dynamics Distribution]`);
const relationships = db
	.query(
		"SELECT relationship_type, COUNT(*) as count FROM scripts_core GROUP BY relationship_type ORDER BY count DESC",
	)
	.all() as any[];
for (const r of relationships) {
	console.log(`- ${r.relationship_type.padEnd(35)}: ${r.count} scripts`);
}

// 4. 音響 & 言語特徴量の統計分析
console.log(`\n[4. Multi-Dimensional Comfort Feature Audit (Averages)]`);
const stats = db
	.query(`
	SELECT 
		AVG(a.asmr_density) as avg_asmr,
		MAX(a.asmr_density) as max_asmr,
		AVG(a.silence_ratio) as avg_silence,
		AVG(d.reassurance_density) as avg_reassurance,
		MAX(d.reassurance_density) as max_reassurance,
		AVG(d.name_mention_frequency) as avg_name_mentions,
		AVG(a.proximity_events_count) as avg_proximity,
		AVG(a.panning_cue_count) as avg_panning
	FROM acoustic_features a
	JOIN dialogue_features d ON a.script_id = d.script_id
	`)
	.get() as any;

const fmtPct = (value: unknown) => {
	const n = Number(value);
	return Number.isFinite(n) ? `${(n * 100).toFixed(2)}%` : "0.00%";
};
const fmtNum = (value: unknown) => {
	const n = Number(value);
	return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

console.log(
	`- Average ASMR trigger density (whisper/breath cues): ${fmtPct(stats?.avg_asmr)} (Max: ${fmtPct(stats?.max_asmr)})`,
);
console.log(
	`- Average Silence ratio (pauses & quiet breathing):  ${fmtPct(stats?.avg_silence)}`,
);
console.log(
	`- Average Reassurance Density (comfort phrase rate): ${fmtPct(stats?.avg_reassurance)} (Max: ${fmtPct(stats?.max_reassurance)})`,
);
console.log(
	`- Average Listener direct name/pet name mentions:     ${fmtNum(stats?.avg_name_mentions)} times/script`,
);
console.log(
	`- Average Proximity shifts (ear whisper cues):         ${fmtNum(stats?.avg_proximity)} times/script`,
);
console.log(
	`- Average Panning shifts (stereo movement cues):       ${fmtNum(stats?.avg_panning)} times/script`,
);

// 5. 最も人気のある evergreen 台本トップ 10
console.log(`\n[5. Top 10 Evergreen ASMR Scripts (By Upvotes/Popularity)]`);
const topScripts = db
	.query(`
	SELECT c.title, c.author, c.relationship_type, m.popularity_score, m.total_views
	FROM scripts_core c
	JOIN market_metrics m ON c.id = m.script_id
	ORDER BY m.popularity_score DESC
	LIMIT 10
`)
	.all() as any[];

topScripts.forEach((s, idx) => {
	console.log(
		`${String(idx + 1).padStart(2)}. [Upvotes: ${String(s.popularity_score).padEnd(4)} | Est. Views: ${String(s.total_views).padEnd(6)}] "${s.title}" by ${s.author} (${s.relationship_type})`,
	);
});

db.close();
console.log("\n=== DEEP AUDIT COMPLETED ===");
