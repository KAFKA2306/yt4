import * as fs from "node:fs";
import * as path from "node:path";
import { Publisher } from "./runtime/publisher";

async function main() {
	const assetArg = process.argv[2];
	const uploadArg = process.argv[3];
	if (!assetArg || !uploadArg) {
		console.error(
			"Usage: bun src/update_metadata.ts <asset_dir> <upload_json>",
		);
		process.exit(1);
	}
	const assetDir = path.resolve(process.cwd(), assetArg);
	const uploadJsonPath = path.join(assetDir, uploadArg);

	if (!fs.existsSync(uploadJsonPath)) {
		throw new Error(`Upload manifest not found: ${uploadJsonPath}`);
	}

	const upload = JSON.parse(fs.readFileSync(uploadJsonPath, "utf-8"));
	const videoId = upload.video_id;
	if (!videoId) {
		throw new Error("No Video ID found in UPLOAD.json");
	}

	const publisher = new Publisher(assetDir);

	const newTitle =
		"【ASMR/執着】献身的なメイドのリリア。雨の夜、あなたを独占する特別なケア。";
	const newDescription = `「愛しています、ご主人様。私の、たった一人の……大切な……。」

激しい雨の降る夜、遅くまでお仕事を頑張るご主人様。
そんなあなたを放っておけないメイドのリリアが、温かいお茶と、そして……
耳元での囁き、ブラッシング、そして耳掃除。
今夜だけは、世界を敵に回してもあなたの味方でいます。

00:00 ご挨拶と温かいお茶
01:45 ジャケットのお脱がし
03:08 ブラッシング
04:07 膝枕耳掃除

Cast: Lilia (Irodori-TTS)
Scenario: Resonant Archive

#ASMR #メイド #耳掃除 #囁き #睡眠導入 #存在fetish`;

	console.log(`[UPDATE] Updating metadata for video ${videoId}`);

	await publisher.updateVideo({
		videoId,
		metadata: {
			title: newTitle,
			description: newDescription,
			tags: ["ASMR", "メイド", "耳掃除", "囁き", "睡眠導入", "存在fetish"],
			visibility: "public",
		},
	});

	const liveVisibility = await publisher.getVideoVisibility(videoId);
	if (liveVisibility !== "public") {
		throw new Error(
			`YouTube visibility mismatch: expected public, got ${liveVisibility}`,
		);
	}

	// Update local UPLOAD.json
	upload.metadata.title = newTitle;
	upload.metadata.description = newDescription;
	upload.metadata.visibility = liveVisibility.toUpperCase();
	upload.remote_proof = `https://www.youtube.com/watch?v=${videoId}`;
	fs.writeFileSync(uploadJsonPath, JSON.stringify(upload, null, 2));
	console.log(
		`[SUCCESS] Metadata updated locally and on YouTube (${liveVisibility}).`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
