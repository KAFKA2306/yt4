import {
	type EmotionalState,
	EmotionalStateSchema,
	type IdentityContract,
	IdentityContractSchema,
} from "./types";

export class IdentityEngine {
	private contract: IdentityContract;

	constructor(data: any) {
		this.contract = IdentityContractSchema.parse(data);
	}

	getContract() {
		return this.contract;
	}

	smooth(current: EmotionalState, target: EmotionalState): EmotionalState {
		const max = this.contract.invariants.max_emotion_delta;
		const s = (c: number, t: number) =>
			Math.abs(t - c) <= max ? t : c + (t > c ? max : -max);

		const next = {
			valence: s(current.valence, target.valence),
			arousal: Math.min(
				s(current.arousal, target.arousal),
				this.contract.invariants.max_arousal,
			),
			softness: Math.max(
				s(current.softness, target.softness),
				this.contract.invariants.min_softness,
			),
			atmosphere: target.atmosphere,
		};
		return EmotionalStateSchema.parse(next);
	}
}
