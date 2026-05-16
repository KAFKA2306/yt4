import { FailType, RepairAction, ScriptLine } from "./types";

/**
 * Repair Engine
 * Implements bounded actions to recover from verification failures.
 * No "improve this" ambiguity. Only deterministic parameter shifts.
 */
export class RepairEngine {
	/**
	 * Apply a repair action to a chunk's synthesis parameters.
	 */
	apply(
		chunk: ScriptLine[],
		action: RepairAction,
		attempt: number,
	): {
		modifiedChunks: ScriptLine[][];
		overrides: { temperature?: number; seed_offset?: number; caption_suffix?: string };
	} {
		console.log(`[REPAIR] Applying action: ${action} (Attempt: ${attempt})`);

		const overrides: any = { seed_offset: attempt * 100 };

		switch (action) {
			case "lower_temperature":
				overrides.temperature = Math.max(0.1, 0.7 - attempt * 0.2);
				return { modifiedChunks: [chunk], overrides };

			case "split_chunk":
				// Split the chunk into smaller pieces to reduce hallucination risk
				const mid = Math.ceil(chunk.length / 2);
				const left = chunk.slice(0, mid);
				const right = chunk.slice(mid);
				return { modifiedChunks: [left, right], overrides };

			case "shorten_context":
				// Logic would be handled by the pipeline to truncate previous history
				return { modifiedChunks: [chunk], overrides };

			case "refresh_reference":
				// Reset speaker embedding to the initial immutable reference
				return { modifiedChunks: [chunk], overrides };

			case "regenerate_chunk":
				// Simple re-run with new seed
				return { modifiedChunks: [chunk], overrides };

			default:
				return { modifiedChunks: [chunk], overrides };
		}
	}
}
