import * as fs from "node:fs";

export class MetricsManager {
	private events: {
		type: string;
		status: string;
		message?: string;
		timestamp: number;
	}[] = [];
	private startTime: number = Date.now();

	record(event: { type: string; status: string; message?: string }) {
		this.events.push({ ...event, timestamp: Date.now() });
	}

	exportMarkdown(outputPath: string) {
		const duration = (Date.now() - this.startTime) / 1000;
		const summary = {
			duration,
			invariants: this.events.filter(
				(e) => e.type === "invariant" && e.status === "fail",
			).length,
			semantic: this.events.filter(
				(e) => e.type === "semantic" && e.status === "warn",
			).length,
			tts: this.events.filter((e) => e.type === "tts" && e.status === "warn")
				.length,
		};

		const content = `# Resonance Metrics
- Duration: ${summary.duration.toFixed(2)}s
- Invariant Violations: ${summary.invariants}
- Semantic Warnings: ${summary.semantic}
- TTS Retries: ${summary.tts}
- Total Events: ${this.events.length}
`;
		fs.writeFileSync(outputPath, content);
	}
}
