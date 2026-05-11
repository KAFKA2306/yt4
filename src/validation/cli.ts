import * as path from "node:path";
import type { ScriptLine } from "../runtime/types";
import { ASRValidator } from "./asr";

async function main() {
	const args = process.argv.slice(2);
	if (args.length < 2) {
		console.log(
			"Usage: bun src/validation/cli.ts <audio_path> <expected_text>",
		);
		process.exit(1);
	}

	const audioPath = path.resolve(args[0]);
	const expectedText = args[1];
	const script: ScriptLine[] = [{ text: expectedText, pause_after: 0 }];

	const validator = new ASRValidator();
	console.log(`[VALIDATE] Auditing: ${audioPath}`);

	const report = await validator.validate(audioPath, script);

	if (report.is_damaged) {
		console.error(`[FAILURE] Damage detected!`);
		console.error(`Score Details: ${JSON.stringify(report, null, 2)}`);
		process.exit(1);
	}

	console.log(`[SUCCESS] Audio validated successfully.`);
	console.log(`Transcription: ${report.transcription}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
