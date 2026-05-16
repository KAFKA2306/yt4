import { resolve, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { Orchestrator } from "./src/runtime/orchestrator";

async function main() {
	const assetDirName = process.argv[2] || "008_yandere_maid_management";
	const assetDir = resolve(process.cwd(), "assets", assetDirName);
	const configPath = join(assetDir, "0000_config.json");

	if (!existsSync(configPath)) {
		throw new Error(`Config not found: ${configPath}`);
	}

	const config = JSON.parse(readFileSync(configPath, "utf-8"));
	const orchestrator = new Orchestrator(assetDir, config);
	await orchestrator.run();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
