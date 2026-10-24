import { Router, type IRouter } from "express";
import {
  SearchEventsQueryParams,
  SearchEventsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const SEARCH_ENDPOINT = "https://api.search.tinyfish.ai";
const FETCH_ENDPOINT = "https://api.fetch.tinyfish.ai";
const REQUEST_TIMEOUT_MS = 25_000;
const EVENT_SIGNAL =
  /\b(hackathon|buildathon|coding competition|programming contest|tech meetup|meetup|conference|summit|tech fest|developer event|AI event|competition|challenge|workshop)\b/i;
const REGISTRATION_LINK_SIGNAL =
  /\b(register|registration|apply|application|signup|sign-up|tickets?|rsvp|participate|join)\b/i;

interface SearchCandidate {
  title: string;
  snippet: string;
  url: string;
}

interface FetchedPage {
  title: string | null;
  description: string | null;
  text: string;
  links: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeWebUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractCandidates(payload: unknown, limit: number): SearchCandidate[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) return [];

  const candidates: SearchCandidate[] = [];
  const seen = new Set<string>();

  for (const result of payload.results) {
    if (!isRecord(result)) continue;
    const url = safeWebUrl(result.url);
    if (!url || seen.has(url)) continue;

    seen.add(url);
    candidates.push({
      title: typeof result.title === "string" ? result.title.trim() : "",
      snippet: typeof result.snippet === "string" ? result.snippet.trim() : "",
      url,
    });
    if (candidates.length >= limit) break;
  }

  return candidates;
}

function extractPages(payload: unknown): Map<string, FetchedPage> {
  const pages = new Map<string, FetchedPage>();
  if (!isRecord(payload) || !Array.isArray(payload.results)) return pages;

  for (const result of payload.results) {
    if (!isRecord(result)) continue;
    const url = safeWebUrl(result.url);
    if (!url) continue;

    pages.set(url, {
      title: typeof result.title === "string" ? result.title.trim() : null,
      description:
        typeof result.description === "string"
          ? result.description.trim()
          : null,
      text: typeof result.text === "string" ? result.text : "",
      links: Array.isArray(result.links)
        ? result.links
            .map(safeWebUrl)
            .filter((link): link is string => link !== null)
        : [],
    });
  }

  return pages;
}

function extractLabeledValue(
  text: string,
  labels: string,
  maxLength = 120,
): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]\s*|#+\s*)/, "").trim());
  const pattern = new RegExp(`^(?:${labels})\\s*(?::|[-–—])?\\s*(.*)$`, "i");

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(pattern);
    if (!match) continue;
    const value = (match[1] || lines[index + 1] || "").trim();
    if (!value || value.length < 2) continue;
    return value.slice(0, maxLength);
  }

  return null;
}

function extractSummary(page: FetchedPage | undefined, snippet: string): string | null {
  if (page?.description) return page.description.slice(0, 240);

  const paragraph = page?.text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]\s*|#+\s*)/, "").trim())
    .find((line) => line.length >= 45 && !/^(https?:\/\/|register\b)/i.test(line));

  if (paragraph) return paragraph.slice(0, 240);
  return snippet ? snippet.slice(0, 240) : null;
}

function extractRegistrationUrl(page: FetchedPage | undefined): string | null {
  if (!page) return null;

  const markdownLinks =
    page.text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g);
  for (const match of markdownLinks) {
    if (REGISTRATION_LINK_SIGNAL.test(match[1])) {
      const url = safeWebUrl(match[2]);
      if (url) return url;
    }
  }

  return (
    page.links.find((link) => REGISTRATION_LINK_SIGNAL.test(link)) ?? null
  );
}

router.get("/events/search", async (req, res): Promise<void> => {
  const parsed = SearchEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    req.log.error("TinyFish API key is not configured");
    res.status(502).json({ error: "Event search is not configured yet." });
    return;
  }

  const { topic, city, limit = 6 } = parsed.data;
  const year = new Date().getFullYear();
  const searchQuery = `${topic} events hackathon coding competition tech meetup ${city} India ${year}`;
  const headers = { "X-API-Key": apiKey };

  try {
    const searchUrl = new URL(SEARCH_ENDPOINT);
    searchUrl.searchParams.set("query", searchQuery);
    searchUrl.searchParams.set("purpose", `Find real upcoming or current student technology events in ${city}, India about ${topic}.`);
    searchUrl.searchParams.set("location", "IN");
    searchUrl.searchParams.set("language", "en");

    const searchResponse = await fetch(searchUrl, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!searchResponse.ok) {
      req.log.error(
        { statusCode: searchResponse.status },
        "TinyFish Search API request failed",
      );
      res.status(502).json({ error: "Event search is temporarily unavailable." });
      return;
    }

    const candidates = extractCandidates(
      await readJson(searchResponse),
      10,
    );

    if (candidates.length === 0) {
      res.json(
        SearchEventsResponse.parse({ query: topic, city, events: [] }),
      );
      return;
    }

    const fetchResponse = await fetch(FETCH_ENDPOINT, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls: candidates.map((candidate) => candidate.url),
        format: "markdown",
        links: true,
        purpose: `Verify event details and registration links for ${topic} events in ${city}, India.`,
        per_url_timeout_ms: REQUEST_TIMEOUT_MS,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS + 5_000),
    });
    if (!fetchResponse.ok) {
      req.log.error(
        { statusCode: fetchResponse.status },
        "TinyFish Fetch API request failed",
      );
      res.status(502).json({ error: "Event pages are temporarily unavailable." });
      return;
    }

    const pages = extractPages(await readJson(fetchResponse));
    const events = candidates
      .map((candidate) => {
        const page = pages.get(candidate.url);
        const combinedText = `${candidate.title}\n${candidate.snippet}\n${page?.text ?? ""}`;
        if (!EVENT_SIGNAL.test(combinedText)) return null;

        const name =
          page?.title && EVENT_SIGNAL.test(page.title)
            ? page.title
            : candidate.title || page?.title || candidate.url;
        const date = extractLabeledValue(
          page?.text ?? "",
          "event\\s+dates?|dates?|when|schedule|timing",
        );
        const location = extractLabeledValue(
          page?.text ?? "",
          "venue|location|city|where",
        );
        const registrationUrl = extractRegistrationUrl(page);
        const missingDetails: Array<"date" | "location" | "registration"> = [];
        if (!date) missingDetails.push("date");
        if (!location) missingDetails.push("location");
        if (!registrationUrl) missingDetails.push("registration");

        return {
          name: name.slice(0, 180),
          date,
          location,
          registrationUrl,
          sourceUrl: candidate.url,
          sourceTitle: page?.title || candidate.title || null,
          summary: extractSummary(page, candidate.snippet),
          missingDetails,
        };
      })
      .filter((event): event is NonNullable<typeof event> => event !== null)
      .slice(0, limit);

    res.json(SearchEventsResponse.parse({ query: topic, city, events }));
  } catch (error) {
    req.log.error({ err: error }, "Event search request failed");
    res.status(502).json({ error: "Event search is temporarily unavailable." });
  }
});

export default router;
