import {
	type EmotionalState,
	type IdentityContract,
	IdentityContractSchema,
	type SceneState,
} from "../runtime/types";

export class IdentityManager {
	private activeContract: IdentityContract | null = null;

	load(contractData: any): IdentityContract {
		this.activeContract = IdentityContractSchema.parse(contractData);
		console.log(
			`[IDENTITY] Loaded contract: ${this.activeContract.name} (${this.activeContract.id})`,
		);
		return this.activeContract;
	}

	getContract(): IdentityContract {
		if (!this.activeContract) throw new Error("No identity contract loaded");
		return this.activeContract;
	}

	validateInvariants(
		emotion: EmotionalState,
		scene: SceneState,
		lastEmotion?: EmotionalState,
		lastScene?: SceneState,
	): boolean {
		const { invariants } = this.getContract();

		// Static checks
		if (emotion.arousal > invariants.max_arousal) return false;
		if (emotion.softness < invariants.min_softness) return false;
		if (scene.silence_density < invariants.min_silence_density) return false;

		// Delta checks
		if (lastEmotion) {
			const eDelta =
				Math.abs(emotion.arousal - lastEmotion.arousal) +
				Math.abs(emotion.softness - lastEmotion.softness) +
				Math.abs(emotion.valence - lastEmotion.valence);
			if (eDelta > invariants.max_emotion_delta) return false;
		}

		if (lastScene) {
			const sDelta = Math.abs(scene.room_pressure - lastScene.room_pressure);
			if (sDelta > invariants.max_pressure_delta) return false;
		}

		return true;
	}
}
