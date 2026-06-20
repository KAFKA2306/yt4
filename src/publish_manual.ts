import * as fs from "node:fs";
import * as path from "node:path";
import { DiscordNotifier } from "./runtime/discord";
import { Publisher } from "./runtime/publisher";

async function main() {
	const assetArg = process.argv[2];
	const uploadArg = process.argv[3];
	const videoArg = process.argv[4];
	const imageArg = process.argv[5];
	if (!assetArg || !uploadArg || !videoArg || !imageArg) {
		console.error(
			"Usage: bun src/publish_manual.ts <asset_dir> <upload_json> <video> <image>",
		);
		process.exit(1);
	}
	const assetDir = path.resolve(process.cwd(), assetArg);
	const uploadJsonPath = path.join(assetDir, uploadArg);

	if (!fs.existsSync(uploadJsonPath)) {
		throw new Error(`Upload manifest not found: ${uploadJsonPath}`);
	}

	const upload = JSON.parse(fs.readFileSync(uploadJsonPath, "utf-8"));
	const publisher = new Publisher(assetDir);
	const discord = new DiscordNotifier();

	const videoPath = path.join(assetDir, videoArg);
	const imagePath = path.join(assetDir, imageArg);

	console.log(`[MANUAL PUBLISH] Starting upload for ${videoPath}`);

	discord.assertConfigured();
	const receipt = await publisher.publish({
		videoPath,
		imagePath,
		metadata: {
			title: upload.metadata.title,
			description: upload.metadata.description,
			tags: upload.metadata.tags || ["ASMR", "メイド"],
			visibility: upload.metadata.visibility || "public",
		},
	});

	const liveVisibility = await publisher.getVideoVisibility(receipt.video_id);
	if (liveVisibility !== "public") {
		throw new Error(
			`YouTube visibility mismatch: expected public, got ${liveVisibility}`,
		);
	}

	console.log(`[SUCCESS] Video ID: ${receipt.video_id} (${liveVisibility})`);
	await discord.notifyPublishedUrl({
		url: `https://www.youtube.com/watch?v=${receipt.video_id}`,
		title: upload.metadata.title,
		assetId: upload.asset_id || path.basename(assetDir).split("_")[0],
		sessionId: upload.session_id || upload.sessionId || "unknown",
	});

	// Update UPLOAD.json with video_id
	upload.status = "PUBLISHED";
	upload.video_id = receipt.video_id;
	upload.published_at = receipt.published_at;
	upload.remote_proof = `https://www.youtube.com/watch?v=${receipt.video_id}`;
	upload.metadata.visibility = liveVisibility.toUpperCase();
	fs.writeFileSync(uploadJsonPath, JSON.stringify(upload, null, 2));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
