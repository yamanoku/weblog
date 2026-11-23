// A Speaker Deck deck URL does not contain the player id. Public HTML asks oEmbed for it.

export type SpeakerDeckPlayers = Readonly<Record<string, string>>;

export type SpeakerDeckRef =
  | { kind: "player"; src: string }
  | { kind: "deck"; key: string; slide: string | null };

const segment = /^[A-Za-z0-9._-]+$/;
const playerHash = /^[a-f0-9]{32}$/;
const slideNumber = /^[1-9][0-9]{0,3}$/;
const playerSrc = /^https:\/\/speakerdeck\.com\/player\/[a-f0-9]{32}$/;
const deckFinder = /https?:\/\/(?:www\.)?speakerdeck\.com\/[^\s<>)\]"']+/gi;
const cacheName = "speakerdeck-players";
const memoryMs = 30 * 24 * 60 * 60 * 1000;
const deckLimit = 20;

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function speakerDeckRef(value: string): SpeakerDeckRef | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "speakerdeck.com" && host !== "www.speakerdeck.com") return null;
  const parts = url.pathname.split("/").filter((part) => part.length > 0);
  const slideRaw = url.searchParams.get("slide");
  const slide = slideRaw && slideNumber.test(slideRaw) ? slideRaw : null;
  const id = parts[1] ?? "";
  if (parts.length === 2 && parts[0] === "player" && playerHash.test(id)) {
    return {
      kind: "player",
      src: `https://speakerdeck.com/player/${id}${slide ? `?slide=${slide}` : ""}`,
    };
  }
  const user = parts[0] ?? "";
  const slug = parts[1] ?? "";
  if (parts.length !== 2 || !segment.test(user) || !segment.test(slug)) return null;
  return { kind: "deck", key: `https://speakerdeck.com/${user}/${slug}`, slide };
}

export function speakerDeckDeckKeys(text: string): string[] {
  const keys: string[] = [];
  for (const match of text.matchAll(deckFinder)) {
    const ref = speakerDeckRef(match[0].replace(/[.,;:]+$/, ""));
    if (ref?.kind === "deck") keys.push(ref.key);
  }
  return keys;
}

function cacheRequest(key: string): Request {
  return new Request(
    `https://weblog.yamanoku.net/speakerdeck-player?deck=${encodeURIComponent(key)}`,
  );
}

async function playerCache(): Promise<Cache | null> {
  try {
    const storage = globalThis.caches;
    if (!storage || typeof storage.open !== "function") return null;
    return await storage.open(cacheName);
  } catch {
    return null;
  }
}

async function rememberedPlayer(key: string): Promise<string | null> {
  try {
    const cache = await playerCache();
    const hit = cache ? await cache.match(cacheRequest(key)) : null;
    if (!hit) return null;
    const body = (await hit.json()) as { src?: unknown; until?: unknown };
    if (typeof body.src !== "string" || typeof body.until !== "number") return null;
    if (body.until < Date.now() || !playerSrc.test(body.src)) return null;
    return body.src;
  } catch {
    return null;
  }
}

async function rememberPlayer(key: string, src: string): Promise<void> {
  try {
    const cache = await playerCache();
    if (!cache) return;
    await cache.put(
      cacheRequest(key),
      new Response(JSON.stringify({ src, until: Date.now() + memoryMs }), {
        headers: { "content-type": "application/json", "cache-control": "public, max-age=2592000" },
      }),
    );
  } catch {
    // A missed memory only means the next view asks Speaker Deck again.
  }
}

function playerFromHtml(html: string): string | null {
  return /src=["'](https:\/\/speakerdeck\.com\/player\/[a-f0-9]{32})["']/.exec(html)?.[1] ?? null;
}

async function askSpeakerDeck(
  key: string,
  fetchImpl: FetchLike,
): Promise<{ src: string | null; note: string }> {
  const endpoint = `https://speakerdeck.com/oembed.json?url=${encodeURIComponent(key)}`;
  try {
    const response = await fetchImpl(endpoint, {
      headers: { accept: "application/json", "user-agent": "weblog.yamanoku.net" },
      redirect: "follow",
    });
    if (!response.ok) return { src: null, note: `http ${response.status}` };
    const payload = (await response.json()) as { html?: unknown };
    if (typeof payload.html !== "string") return { src: null, note: "no-html" };
    const src = playerFromHtml(payload.html);
    return src ? { src, note: "ok" } : { src: null, note: "no-player" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return { src: null, note: message.slice(0, 120) };
  }
}

export async function resolveSpeakerDeckPlayers(
  texts: readonly string[],
  fetchImpl: FetchLike = fetch,
): Promise<Record<string, string>> {
  const resolved = await resolveSpeakerDeck(texts, fetchImpl);
  return resolved.players;
}

export async function resolveSpeakerDeck(
  texts: readonly string[],
  fetchImpl: FetchLike = fetch,
): Promise<{ players: Record<string, string>; note: string }> {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const text of texts) {
    for (const key of speakerDeckDeckKeys(text)) {
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
      if (keys.length >= deckLimit) break;
    }
    if (keys.length >= deckLimit) break;
  }
  if (keys.length === 0) return { players: {}, note: "no-keys" };
  const players: Record<string, string> = {};
  const notes: string[] = [];
  await Promise.all(
    keys.map(async (key) => {
      const cached = fetchImpl === fetch ? await rememberedPlayer(key) : null;
      const asked = cached ? { src: cached, note: "cached" } : await askSpeakerDeck(key, fetchImpl);
      notes.push(asked.note);
      if (!asked.src) return;
      players[key] = asked.src;
      if (!cached && fetchImpl === fetch) await rememberPlayer(key, asked.src);
    }),
  );
  return { players, note: notes.join(",") };
}
