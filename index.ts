import { Orchestrator } from "./src/runtime/orchestrator";
import { AssetStore } from "./src/runtime/storage";

async function main() {
	const sessionId = "session-" + Math.random().toString(36).substring(7);
	const store = new AssetStore(sessionId);

	// Determine asset directory from argument or default
	const assetDirName = process.argv[2] || "008_yandere_maid_management";
	const assetDir = require("path").resolve(process.cwd(), "assets", assetDirName);
	const configPath = require("path").join(assetDir, "0000_config.json");
	
	if (!require("fs").existsSync(configPath)) {
		throw new Error(`Config not found: ${configPath}`);
	}

	const config = JSON.parse(require("fs").readFileSync(configPath, "utf-8"));
	const orchestrator = new Orchestrator(store, assetDir, config);
	await orchestrator.run();
}

main().catch(console.error);
