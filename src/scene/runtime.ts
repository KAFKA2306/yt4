import { type SceneState, SceneStateSchema } from "../runtime/types";

export class SceneRuntime {
	private currentState: SceneState;

	constructor(initialState: Partial<SceneState> = {}) {
		this.currentState = SceneStateSchema.parse({
			ambience_type: "room-tone",
			ambience_intensity: 0.2,
			proximity: "medium",
			silence_density: 0.5,
			room_pressure: 0.1,
			...initialState,
		});
	}

	update(patch: Partial<SceneState>) {
		this.currentState = SceneStateSchema.parse({
			...this.currentState,
			...patch,
		});
		console.log(
			`[SCENE] Updated: ${this.currentState.ambience_type} at ${this.currentState.proximity} proximity`,
		);
	}

	getCurrentState(): SceneState {
		return this.currentState;
	}
}
