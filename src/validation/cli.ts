import * as path from "node:path";
import { ASRValidator } from "./asr";

async function main() {
	const [audio, text] = process.argv.slice(2);
	if (!audio || !text) {
		console.log("Usage: bun src/validation/cli.ts <audio> <text>");
		process.exit(1);
	}

	const report = await new ASRValidator().validate(path.resolve(audio), [
		{ text, pause_after: 0 },
	]);
	if (report.is_damaged) {
		console.error(`[FAIL] ${JSON.stringify(report)}`);
		process.exit(1);
	}
	console.log(`[OK] ${report.transcription}`);
}

main().catch(() => process.exit(1));
