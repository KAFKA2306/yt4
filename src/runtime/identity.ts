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

	smooth(
		current: EmotionalState,
		target: Partial<EmotionalState>,
	): EmotionalState {
		const max = this.contract.invariants.max_emotion_delta;
		const s = (c: number, t: number) => {
			if (t === undefined) return c;
			return Math.abs(t - c) <= max ? t : c + (t > c ? max : -max);
		};

		const next = {
			valence: s(current.valence, target.valence as number),
			arousal: Math.min(
				s(current.arousal, target.arousal as number),
				this.contract.invariants.max_arousal,
			),
			softness: Math.max(
				s(current.softness, target.softness as number),
				this.contract.invariants.min_softness,
			),
			atmosphere: target.atmosphere ?? current.atmosphere,
		};
		return EmotionalStateSchema.parse(next);
	}
}
