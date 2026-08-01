import * as fs from "node:fs";
import * as path from "node:path";
import { Orchestrator } from "./runtime/orchestrator";
import { Publisher } from "./runtime/publisher";

type UploadManifest = {
  asset_id?: string;
  request_id?: string;
  session_id?: string;
  status: string;
  video_id?: string;
  published_at?: string;
  remote_proof?: string;
  metadata: {
    title: string;
    description: string;
    tags?: string[];
    category_id?: string;
    visibility?: "public" | "private" | "unlisted";
  };
};

function newestRenderedVideo(assetDir: string, assetId: string): string {
  const candidates = fs
    .readdirSync(assetDir)
    .filter((name) => name.startsWith(`${assetId}_session-`) && name.endsWith(".mp4"))
    .map((name) => ({
      path: path.join(assetDir, name),
      mtime: fs.statSync(path.join(assetDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (candidates.length === 0) {
    throw new Error(`Rendered video not found in ${assetDir}`);
  }
  return candidates[0].path;
}

async function main() {
  const assetArg = process.argv[2] || "assets/032_amazon_anthropic_q2";
  const assetDir = path.resolve(process.cwd(), assetArg);
  const configPath = path.join(assetDir, "0000_config.json");
  const uploadPath = path.join(assetDir, "UPLOAD.json");

  if (!fs.existsSync(configPath)) throw new Error(`Config not found: ${configPath}`);
  if (!fs.existsSync(uploadPath)) throw new Error(`Upload manifest not found: ${uploadPath}`);

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const upload = JSON.parse(fs.readFileSync(uploadPath, "utf-8")) as UploadManifest;
  const assetId = upload.asset_id || path.basename(assetDir).split("_")[0];

  if (upload.status === "PUBLISHED" && upload.video_id) {
    console.log(`[IDEMPOTENT] Already published: https://www.youtube.com/watch?v=${upload.video_id}`);
    return;
  }

  const imagePath = path.resolve(assetDir, config.image_path);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Thumbnail/render image not found: ${imagePath}`);
  }

  const previousAutoPublish = process.env.YOUTUBE_PUBLISH_AUTO;
  process.env.YOUTUBE_PUBLISH_AUTO = "false";
  try {
    const orchestrator = new Orchestrator(assetDir, config);
    await orchestrator.run();
  } finally {
    if (previousAutoPublish === undefined) delete process.env.YOUTUBE_PUBLISH_AUTO;
    else process.env.YOUTUBE_PUBLISH_AUTO = previousAutoPublish;
  }

  const videoPath = newestRenderedVideo(assetDir, assetId);
  const sessionMatch = path.basename(videoPath).match(/^[^_]+_(session-[^.]+)\.mp4$/);
  const sessionId = sessionMatch?.[1] || "unknown";

  const publisher = new Publisher(assetDir);
  const receipt = await publisher.publish({
    videoPath,
    imagePath,
    metadata: {
      title: upload.metadata.title,
      description: upload.metadata.description,
      tags: upload.metadata.tags || [],
      category_id: upload.metadata.category_id || "27",
      visibility: upload.metadata.visibility || "public",
    },
  });

  const visibility = await publisher.getVideoVisibility(receipt.video_id);
  if (visibility !== "public") {
    throw new Error(`YouTube visibility mismatch: expected public, got ${visibility}`);
  }

  const publicUrl = `https://www.youtube.com/watch?v=${receipt.video_id}`;
  upload.status = "PUBLISHED";
  upload.video_id = receipt.video_id;
  upload.published_at = receipt.published_at || new Date().toISOString();
  upload.remote_proof = publicUrl;
  upload.session_id = sessionId;
  upload.metadata.visibility = "public";
  fs.writeFileSync(uploadPath, `${JSON.stringify(upload, null, 2)}\n`);

  const receiptPath = path.join(assetDir, "PUBLISH_RECEIPT.json");
  fs.writeFileSync(
    receiptPath,
    `${JSON.stringify(
      {
        request_id: upload.request_id,
        asset_id: assetId,
        session_id: sessionId,
        video_id: receipt.video_id,
        public_url: publicUrl,
        channel_id: receipt.channel_id,
        channel_title: receipt.channel_title,
        visibility,
        published_at: upload.published_at,
        video_file: path.basename(videoPath),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`[PUBLISH] Confirmed public: ${publicUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
