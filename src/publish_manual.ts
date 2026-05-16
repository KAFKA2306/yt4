import * as fs from "node:fs";
import * as path from "node:path";
import { Publisher } from "./runtime/publisher";

async function main() {
	const assetDir = path.resolve(process.cwd(), "assets/010_devoted_maid_lilia");
	const uploadJsonPath = path.join(assetDir, "0017_session-kf42n_UPLOAD.json");

	if (!fs.existsSync(uploadJsonPath)) {
		throw new Error(`Upload manifest not found: ${uploadJsonPath}`);
	}

	const upload = JSON.parse(fs.readFileSync(uploadJsonPath, "utf-8"));
	const publisher = new Publisher(assetDir);

	const videoPath = path.join(assetDir, "0017_session-kf42n.mp4");
	const imagePath = path.join(assetDir, "thumbnail-v2.png");

	console.log(`[MANUAL PUBLISH] Starting upload for ${videoPath}`);

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

	console.log(`[SUCCESS] Video ID: ${receipt.video_id}`);

	// Update UPLOAD.json with video_id
	upload.status = "PUBLISHED";
	upload.video_id = receipt.video_id;
	upload.published_at = receipt.published_at;
	fs.writeFileSync(uploadJsonPath, JSON.stringify(upload, null, 2));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
