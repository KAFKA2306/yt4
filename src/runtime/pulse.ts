import { join } from "node:path";
import { LifeLogManager } from "../domain/lifelog";
import type { EmotionalState } from "./types";

/**
 * Research-Driven Pulse Management
 * ECC WebSearch & Research Standards compliant.
 */
export class PulseManager {
	private lifelog: LifeLogManager;

	constructor() {
		this.lifelog = new LifeLogManager(
			join(process.cwd(), "data", "lifelog", "triples.jsonl"),
		);
	}

	private stages = [
		{ name: "Intro", valence: 0.1, arousal: 0.05, softness: 0.95 },
		{ name: "Physical Comfort", valence: 0.3, arousal: 0.1, softness: 0.98 },
		{ name: "Deepening", valence: 0.5, arousal: 0.15, softness: 0.99 },
		{ name: "Sleep Induction", valence: 0.2, arousal: 0.02, softness: 1.0 },
	];

	async observe(progress: number): Promise<Partial<EmotionalState>> {
		// Daily Pulse: Grounded in LifeLog observations
		const memories = this.lifelog.search("かふか");
		const recentMemories = memories.slice(-5);

		// Bias-Free Observation: Extracting current tension/arousal from recent activities
		const isPokerActive = recentMemories.some((m) =>
			m.object.includes("ポーカー"),
		);
		const isVrcActive = recentMemories.some((m) => m.object.includes("VRChat"));

		const globalPulse = {
			tension: isPokerActive ? 0.8 : 0.6,
			recharge_desire: isVrcActive ? 0.9 : 0.7,
		};

		const stageIndex = Math.min(
			Math.floor(progress * this.stages.length),
			this.stages.length - 1,
		);
		const stage = this.stages[stageIndex];

		return {
			valence: Math.min(1.0, stage.valence + globalPulse.recharge_desire * 0.1),
			arousal: Math.max(0.0, stage.arousal - globalPulse.tension * 0.05),
			softness: Math.min(
				1.0,
				stage.softness + globalPulse.recharge_desire * 0.05,
			),
			atmosphere: "cinematic-late-night-rain",
		};
	}
}
