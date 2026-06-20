import * as fs from "node:fs";
import * as path from "node:path";
import { Orchestrator } from "./runtime/orchestrator";

type CampaignManifest = {
	name: string;
	asset_dirs: string[];
};

async function main() {
	const manifestArg =
		process.argv[2] || "campaigns/daily_situation_voice_campaign.json";
	const manifestPath = path.resolve(process.cwd(), manifestArg);

	if (!fs.existsSync(manifestPath)) {
		throw new Error(`Campaign manifest not found: ${manifestPath}`);
	}

	const campaign = JSON.parse(
		fs.readFileSync(manifestPath, "utf-8"),
	) as CampaignManifest;

	if (!Array.isArray(campaign.asset_dirs) || campaign.asset_dirs.length === 0) {
		throw new Error("Campaign manifest must include at least one asset_dir.");
	}

	console.log(`[CAMPAIGN] Starting ${campaign.name}`);
	for (const assetDirName of campaign.asset_dirs) {
		const assetDir = path.resolve(process.cwd(), "assets", assetDirName);
		const configPath = path.join(assetDir, "0000_config.json");
		if (!fs.existsSync(configPath)) {
			throw new Error(`Config not found for ${assetDirName}: ${configPath}`);
		}

		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
		console.log(`[CAMPAIGN] Running ${assetDirName}`);
		const orchestrator = new Orchestrator(assetDir, config);
		await orchestrator.run();
	}
	console.log(`[CAMPAIGN] Completed ${campaign.name}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
