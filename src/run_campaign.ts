import * as fs from "node:fs";
import * as path from "node:path";
import { Orchestrator } from "./runtime/orchestrator";
import { resolveDailyTrend, type TrendSourceConfig } from "./runtime/trend";

type CampaignManifest = {
	name: string;
	asset_dirs: string[];
	trend?: TrendSourceConfig;
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

	const trend = campaign.trend
		? await resolveDailyTrend(campaign.trend)
		: undefined;
	if (trend) {
		const trendPath = path.resolve(process.cwd(), "data", "daily_trend.json");
		fs.mkdirSync(path.dirname(trendPath), { recursive: true });
		fs.writeFileSync(trendPath, JSON.stringify(trend, null, 2));
		console.log(
			`[CAMPAIGN] Trend selected: ${trend.selected.subreddit} | ${trend.selected.title}`,
		);
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
		const intent = trend
			? `${trend.intent}\nvoice:${config.identity.name}\natmosphere:${config.identity.preferred_atmosphere ?? ""}`
			: undefined;
		const orchestrator = new Orchestrator(
			assetDir,
			intent ? { ...config, intent } : config,
		);
		await orchestrator.run();
	}
	console.log(`[CAMPAIGN] Completed ${campaign.name}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
