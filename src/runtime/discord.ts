export class DiscordNotifier {
	constructor(
		private webhookUrl: string = process.env.DISCORD_WEBHOOK_URL?.trim() || "",
	) {}

	assertConfigured() {
		if (!this.webhookUrl) {
			console.warn(
				"[DISCORD] DISCORD_WEBHOOK_URL not set; publish notifications will be skipped.",
			);
			return false;
		}
		return true;
	}

	async notifyPublishedUrl(params: {
		url: string;
		title: string;
		assetId: string;
		sessionId: string;
	}) {
		if (!this.assertConfigured()) {
			return;
		}

		const content = [
			"New public YouTube post published.",
			`Title: ${params.title}`,
			`URL: ${params.url}`,
			`Asset: ${params.assetId}`,
			`Session: ${params.sessionId}`,
		].join("\n");

		const response = await fetch(this.webhookUrl, {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ content }),
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(
				`Discord webhook failed (${response.status}): ${body || "empty response"}`,
			);
		}
	}
}
