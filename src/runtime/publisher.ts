import * as fs from "node:fs";
import * as path from "node:path";
import { google } from "googleapis";
import type { ProductionState } from "./types";

export interface PublishReceipt {
	status: "uploaded";
	video_id: string;
	channel_id: string;
	channel_title: string;
	privacy_status: string;
	published_at: string;
	raw_response: string;
}

export class Publisher {
	private youtube = google.youtube("v3");

	constructor(private assetDir: string) {}

	async publish(params: {
		videoPath: string;
		imagePath: string;
		metadata: {
			title: string;
			description: string;
			tags: string[];
			category_id?: string;
			visibility?: string;
		};
	}): Promise<PublishReceipt> {
		const auth = this.createYouTubeClient();
		const youtube = google.youtube({ version: "v3", auth });

		await this.verifyYouTubeChannel(youtube);

		console.log(`[PUBLISH] Uploading video: ${params.videoPath}`);
		const res = await youtube.videos.insert({
			part: ["snippet", "status"],
			requestBody: {
				snippet: {
					title: params.metadata.title,
					description: params.metadata.description,
					tags: params.metadata.tags,
					categoryId: params.metadata.category_id || "24",
				},
				status: {
					privacyStatus: params.metadata.visibility || "unlisted",
					selfDeclaredMadeForKids: false,
				},
			},
			media: {
				body: fs.createReadStream(params.videoPath),
			},
		});

		const videoId = res.data.id;
		if (!videoId)
			throw new Error("YouTube upload failed: No VideoID returned.");

		console.log(`[PUBLISH] Video uploaded: ${videoId}`);

		if (params.imagePath && fs.existsSync(params.imagePath)) {
			await youtube
				.thumbnails.set({
					videoId: videoId,
					media: {
						mimeType: "image/png",
						body: fs.createReadStream(params.imagePath),
					},
				})
				.then(() => {
					console.log("[PUBLISH] Thumbnail set.");
				})
				.catch((error: unknown) => {
					console.warn(
						`[PUBLISH] Thumbnail upload skipped: ${(error as Error).message}`,
					);
				});
		}

		return {
			status: "uploaded",
			video_id: videoId,
			channel_id: res.data.snippet?.channelId || "",
			channel_title: res.data.snippet?.channelTitle || "",
			privacy_status: res.data.status?.privacyStatus || "",
			published_at: res.data.snippet?.publishedAt || "",
			raw_response: JSON.stringify(res.data),
		};
	}

	async updateVideo(params: {
		videoId: string;
		metadata: {
			title?: string;
			description?: string;
			tags?: string[];
			category_id?: string;
			visibility?: string;
		};
	}) {
		const auth = this.createYouTubeClient();
		const youtube = google.youtube({ version: "v3", auth });

		await youtube.videos.update({
			part: ["snippet", "status"],
			requestBody: {
				id: params.videoId,
				snippet: {
					title: params.metadata.title,
					description: params.metadata.description,
					tags: params.metadata.tags,
					categoryId: params.metadata.category_id || "24",
				},
				status: {
					privacyStatus: params.metadata.visibility || "unlisted",
				},
			},
		});
		console.log(`[PUBLISH] Video updated: ${params.videoId}`);
	}

	private createYouTubeClient() {
		const clientId = process.env.YOUTUBE_CLIENT_ID;
		const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
		const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
		const redirectUri =
			process.env.YOUTUBE_REDIRECT_URI ||
			"http://localhost:3000/oauth2callback";

		if (!clientId || !clientSecret || !refreshToken) {
			throw new Error("YouTube API credentials missing in environment.");
		}

		const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
		auth.setCredentials({ refresh_token: refreshToken });
		return auth;
	}

	private async verifyYouTubeChannel(youtube: any) {
		const expectedTitle = process.env.YOUTUBE_EXPECTED_CHANNEL_TITLE?.trim();
		const expectedId = process.env.YOUTUBE_EXPECTED_CHANNEL_ID?.trim();

		const res = await youtube.channels.list({
			part: ["id", "snippet"],
			mine: true,
		});

		const channel = res.data.items?.[0];
		if (!channel)
			throw new Error("YouTube preflight failed: No channel found.");

		const actualTitle = channel.snippet?.title;
		const actualId = channel.id;

		if (expectedTitle && actualTitle !== expectedTitle) {
			throw new Error(
				`CHANNEL MISMATCH: Expected "${expectedTitle}" but got "${actualTitle}"`,
			);
		}

		if (expectedId && actualId !== expectedId) {
			throw new Error(
				`CHANNEL ID MISMATCH: Expected "${expectedId}" but got "${actualId}"`,
			);
		}

		console.log(`[PUBLISH] Channel verified: ${actualTitle} (${actualId})`);
	}
}
