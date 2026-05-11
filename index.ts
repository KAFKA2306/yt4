import { Orchestrator } from "./src/runtime/orchestrator";
import { AssetStore } from "./src/runtime/storage";

async function main() {
	const sessionId = "session-" + Math.random().toString(36).substring(7);
	const store = new AssetStore(sessionId);

	// Defining the Identity Contract for Kafka
	const kafkaIdentity = {
		id: "kafka-01",
		name: "Kafka",
		voice_id: "irodori-kafka-v2",
		pacing_base: 0.85,
		hesitation_frequency: 0.2,
		breathing_frequency: 0.3,
		preferred_atmosphere: "late-night",
		invariants: {
			max_arousal: 0.3,
			min_softness: 0.7,
			max_emotion_delta: 0.15,
			max_pressure_delta: 0.2,
			min_silence_density: 0.4,
		},
	};

	const initialEmotion = {
		valence: 0.1,
		arousal: 0.05,
		softness: 0.9,
		atmosphere: "midnight-rain",
	};

	const initialScene = {
		ambience_type: "rain",
		ambience_intensity: 0.4,
		proximity: "intimate" as const,
		silence_density: 0.8,
		room_pressure: 0.1,
	};

	const orchestrator = new Orchestrator(store, kafkaIdentity);
	await orchestrator.run();
}

main().catch(console.error);
