import type { RepairAction, ScriptLine } from "./types";

export type FailureReason =
	| "NONE"
	| "WHISPER_LIMIT"
	| "ACOUSTIC_DAMAGE"
	| "SILENCE_OR_TOO_SOFT"
	| "SPEAKER_DRIFT"
	| "BRIDGE_CRASH";

export class RepairEngine {
	apply(
		chunk: ScriptLine[],
		reason: FailureReason | RepairAction,
		attempt: number,
	): {
		modifiedChunks: ScriptLine[][];
		overrides: {
			temperature?: number;
			seed_offset?: number;
			softness_delta?: number;
		};
	} {
		console.log(`[REPAIR] Reason: ${reason} (Attempt: ${attempt})`);
		const overrides: any = { seed_offset: attempt * 100 };

		switch (reason) {
			case "ACOUSTIC_DAMAGE":
				overrides.temperature = Math.max(0.1, 0.5 - attempt * 0.1);
				return {
					modifiedChunks: chunk.length > 1 ? this.split(chunk) : [chunk],
					overrides,
				};

			case "SILENCE_OR_TOO_SOFT":
				overrides.softness_delta = -0.2 * attempt;
				return { modifiedChunks: [chunk], overrides };

			case "SPEAKER_DRIFT":
				return { modifiedChunks: [chunk], overrides };

			default:
				return { modifiedChunks: [chunk], overrides };
		}
	}

	private split(chunk: ScriptLine[]): ScriptLine[][] {
		const mid = Math.ceil(chunk.length / 2);
		return [chunk.slice(0, mid), chunk.slice(mid)];
	}
}
