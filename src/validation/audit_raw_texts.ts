import { Database } from "bun:sqlite";

console.log("=== RAW TEXT INGESTION & CONTENT INTEGRITY AUDIT ===");

const db = new Database("data/comfort_interface.db", { readonly: true });

// 1. レコードカウントと欠損（空データ）チェック
const totalRow = db
	.query("SELECT COUNT(*) as cnt FROM raw_scripts")
	.get() as any;
const total = totalRow?.cnt || 0;

const emptyRow = db
	.query(
		"SELECT COUNT(*) as cnt FROM raw_scripts WHERE raw_text IS NULL OR TRIM(raw_text) = ''",
	)
	.get() as any;
const emptyCount = emptyRow?.cnt || 0;

// 2. 文字数（文字数分布）の統計算出
const lengths = db
	.query("SELECT LENGTH(raw_text) as len FROM raw_scripts")
	.all() as any[];
const lengthList = lengths.map((row) => row.len as number);

const sum = lengthList.reduce((a, b) => a + b, 0);
const avg = sum / (lengthList.length || 1);
const max = lengthList.length > 0 ? Math.max(...lengthList) : 0;
const min = lengthList.length > 0 ? Math.min(...lengthList) : 0;
const lossRate = total > 0 ? ((emptyCount / total) * 100).toFixed(2) : "0.00";
const ingestRate =
	total > 0 ? (((total - emptyCount) / total) * 100).toFixed(2) : "0.00";

console.log(`\n[1. Content Completeness Metrics]`);
console.log(`- Total Raw Script Records Checked:   ${total}`);
console.log(
	`- Empty or Null Content Scripts:      ${emptyCount} (Loss Rate: ${lossRate}%)`,
);
console.log(
	`- Successfully Ingested Scripts Rate: ${ingestRate}% (Target: 100.00%)`,
);

console.log(`\n[2. Script Text Volume Distribution]`);
console.log(
	`- Total Characters Ingested:          ${sum.toLocaleString()} chars`,
);
console.log(
	`- Average Character Count Per Script: ${Math.round(avg).toLocaleString()} chars`,
);
console.log(
	`- Longest Script Character Count:     ${max.toLocaleString()} chars`,
);
console.log(
	`- Shortest Script Character Count:    ${min.toLocaleString()} chars`,
);

// 3. 実際の台本本文の抜き出し（冒頭部ダンプ）
console.log(`\n[3. Raw Script Content Audits (Samples - First 150 chars)]`);

const samples = db
	.query(`
	SELECT c.title, c.author, r.raw_text
	FROM raw_scripts r
	JOIN scripts_core c ON r.script_id = c.id
	ORDER BY LENGTH(r.raw_text) DESC
	LIMIT 3
`)
	.all() as any[];

samples.forEach((s, idx) => {
	console.log(`\n--------------------------------------------------`);
	console.log(`Sample #${idx + 1}: "${s.title}" by ${s.author}`);
	console.log(`Total Length: ${s.raw_text.length.toLocaleString()} chars`);
	console.log(`--- [Content Snippet] ---`);
	const snippet = s.raw_text.slice(0, 180).trim().replace(/\n/g, " ");
	console.log(`"${snippet}..."`);
});

db.close();
console.log("\n=== CONTENT AUDIT COMPLETED ===");
