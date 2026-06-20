type TrendTheme =
	| "rain"
	| "office"
	| "morning"
	| "ear"
	| "maid"
	| "study"
	| "station"
	| "sleep"
	| "care"
	| "cafe"
	| "coding"
	| "news"
	| "calm";

type TrendSourceName = "reddit" | "github" | "hackernews";

export type TrendSourceConfig = {
	subreddits: string[];
	limit?: number;
	time_window?: "day" | "week" | "month";
	source_priority?: TrendSourceName[];
};

type TrendCandidate = {
	title: string;
	summary: string;
	subreddit: string;
	url: string;
	permalink: string;
	published_at: string;
	source_feed: string;
	source_kind: TrendSourceName;
	rank_index: number;
	score: number;
};

export type DailyTrend = {
	captured_at: string;
	selected: TrendCandidate;
	candidates: Omit<TrendCandidate, "summary">[];
	theme: TrendTheme;
	intent: string;
};

const USER_AGENT = "yt4-daily-campaign/1.0 (by Codex)";

function decodeHtmlEntities(value: string) {
	return value
		.replaceAll("&amp;", "&")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&#39;", "'")
		.replaceAll("&#32;", " ")
		.replace(/&#(\d+);/g, (_, code) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		);
}

function cleanText(value: string) {
	return decodeHtmlEntities(value)
		.replace(/\s+/g, " ")
		.replace(/^\[.*?\]\s*/, "")
		.replace(/^\(.*?\)\s*/, "")
		.trim();
}

function buildIntent(theme: TrendTheme, trend: TrendCandidate) {
	return [
		`theme:${theme}`,
		`trend:${trend.title}`,
		`summary:${trend.summary}`,
		`source:${trend.source_feed}`,
	].join("\n");
}

function detectTheme(text: string): TrendTheme {
	const normalized = text.toLowerCase();
	const rules: Array<[TrendTheme, string[]]> = [
		["rain", ["rain", "umbrella", "storm", "drizzle", "wet"]],
		[
			"study",
			["study", "library", "book", "reading", "exam", "homework", "class"],
		],
		[
			"station",
			[
				"train",
				"station",
				"commute",
				"subway",
				"bus",
				"terminal",
				"last train",
			],
		],
		[
			"office",
			["office", "work", "overtime", "meeting", "deadline", "boss", "desk"],
		],
		[
			"morning",
			["morning", "breakfast", "coffee", "tea", "toast", "wake up", "sunrise"],
		],
		["sleep", ["sleep", "bed", "insomnia", "pillow", "night", "dream"]],
		["ear", ["ear", "whisper", "close", "near"]],
		[
			"maid",
			["maid", "clean", "care", "wash", "laundry", "tidy", "bath", "hair"],
		],
		["cafe", ["cafe", "coffee shop", "latte", "barista"]],
		[
			"coding",
			[
				"github",
				"repo",
				"code",
				"developer",
				"open source",
				"rust",
				"python",
				"typescript",
				"api",
				"build",
			],
		],
		["news", ["news", "launch", "startup", "research", "browser", "release"]],
	];

	for (const [theme, keywords] of rules) {
		if (keywords.some((keyword) => normalized.includes(keyword))) {
			return theme;
		}
	}

	return "calm";
}

async function fetchJson<T>(url: string) {
	const response = await fetch(url, {
		headers: {
			"User-Agent": USER_AGENT,
		},
	});
	if (!response.ok) {
		throw new Error(`${url} failed: ${response.status}`);
	}
	return (await response.json()) as T;
}

async function fetchText(url: string) {
	const response = await fetch(url, {
		headers: {
			"User-Agent": USER_AGENT,
		},
	});
	if (!response.ok) {
		throw new Error(`${url} failed: ${response.status}`);
	}
	return await response.text();
}

async function loadRedditCandidates(
	subreddits: string[],
	limit: number,
	timeWindow: "day" | "week" | "month",
) {
	const results = await Promise.allSettled(
		subreddits.map(async (subreddit) => {
			const url = new URL(`https://www.reddit.com/r/${subreddit}/top/.rss`);
			url.searchParams.set("t", timeWindow);
			url.searchParams.set("limit", String(limit));
			const xml = await fetchText(url.toString());
			const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g));
			return entries.map((match, rankIndex) => {
				const entry = match[1];
				const title = cleanText(
					entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "",
				);
				const summary = cleanText(
					entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? "",
				);
				const urlMatch = entry.match(/<link[^>]*href="([^"]+)"/);
				const link = urlMatch?.[1] ?? "";
				const published =
					entry.match(/<published>([\s\S]*?)<\/published>/)?.[1] ??
					entry.match(/<updated>([\s\S]*?)<\/updated>/)?.[1] ??
					new Date().toISOString();

				return {
					title,
					summary,
					subreddit,
					url: link,
					permalink: link,
					published_at: published,
					source_feed: `r/${subreddit}`,
					source_kind: "reddit" as const,
					rank_index: rankIndex,
					score: 1000 - rankIndex,
				};
			});
		}),
	);

	return results
		.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
		.filter((candidate) => candidate.title.length > 0)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			if (a.source_feed !== b.source_feed) {
				return a.source_feed.localeCompare(b.source_feed);
			}
			return a.rank_index - b.rank_index;
		});
}

async function loadGitHubCandidates(limit: number) {
	const html = await fetchText("https://github.com/trending?since=daily");
	const articles = Array.from(
		html.matchAll(/<article class="Box-row">([\s\S]*?)<\/article>/g),
	);

	return articles
		.slice(0, limit)
		.map((match, rankIndex) => {
			const article = match[1];
			const title = cleanText(
				article.match(
					/<h2 class="h3 lh-condensed">[\s\S]*?<a[^>]*href="([^"]+)"/,
				)?.[1] ?? "",
			).replace(/^\//, "");
			const summary = cleanText(
				article.match(
					/<p class="col-9 color-fg-muted[^"]*">([\s\S]*?)<\/p>/,
				)?.[1] ?? "",
			);
			const link = `https://github.com/${title}`;
			return {
				title,
				summary,
				subreddit: "github",
				url: link,
				permalink: link,
				published_at: new Date().toISOString(),
				source_feed: "github/trending?since=daily",
				source_kind: "github" as const,
				rank_index: rankIndex,
				score: 1000 - rankIndex,
			};
		})
		.filter((candidate) => candidate.title.length > 0);
}

async function loadHackerNewsCandidates(limit: number) {
	const ids = await fetchJson<number[]>(
		"https://hacker-news.firebaseio.com/v0/topstories.json",
	);
	const storyIds = ids.slice(0, limit * 2);
	const stories = await Promise.allSettled(
		storyIds.map(async (id, rankIndex) => {
			const story = await fetchJson<{
				title?: string;
				url?: string;
				text?: string;
				type?: string;
				time?: number;
			}>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
			if (story.type !== "story" || !story.title) return null;
			const link =
				story.url ?? `https://news.ycombinator.com/item?id=${String(id)}`;
			return {
				title: cleanText(story.title),
				summary: cleanText(story.text ?? ""),
				subreddit: "hackernews",
				url: link,
				permalink: `https://news.ycombinator.com/item?id=${String(id)}`,
				published_at: new Date(
					(story.time ?? Date.now() / 1000) * 1000,
				).toISOString(),
				source_feed: "hackernews/topstories",
				source_kind: "hackernews" as const,
				rank_index: rankIndex,
				score: 1000 - rankIndex,
			};
		}),
	);

	return stories
		.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
		.filter(
			(candidate): candidate is NonNullable<typeof candidate> =>
				candidate !== null,
		)
		.filter((candidate) => candidate.title.length > 0)
		.sort((a, b) => b.score - a.score || a.rank_index - b.rank_index);
}

function rotate<T>(items: T[], offset: number) {
	const index = offset % items.length;
	return items.slice(index).concat(items.slice(0, index));
}

function publicCandidate(candidate: TrendCandidate) {
	const { summary: _summary, ...rest } = candidate;
	return rest;
}

export async function resolveDailyTrend(
	config: TrendSourceConfig,
): Promise<DailyTrend> {
	const limit = config.limit ?? 10;
	const timeWindow = config.time_window ?? "day";
	const sourceOrder = rotate(
		(config.source_priority ?? [
			"reddit",
			"github",
			"hackernews",
		]) as TrendSourceName[],
		Math.floor(Date.now() / 86_400_000),
	);

	for (const source of sourceOrder) {
		const candidates = await (async () => {
			if (source === "reddit") {
				return await loadRedditCandidates(config.subreddits, limit, timeWindow);
			}
			if (source === "github") {
				return await loadGitHubCandidates(limit);
			}
			return await loadHackerNewsCandidates(limit);
		})();

		if (candidates.length === 0) {
			continue;
		}

		const selected = candidates[0];
		const theme = detectTheme(`${selected.title} ${selected.summary}`);

		return {
			captured_at: new Date().toISOString(),
			selected,
			candidates: candidates.map(publicCandidate),
			theme,
			intent: buildIntent(theme, selected),
		};
	}

	throw new Error("No daily trend candidates could be resolved.");
}
