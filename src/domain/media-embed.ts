// Public HTML for a YouTube, Spotify, or Speaker Deck link. The stored text stays the original URL.

import { speakerDeckRef, type SpeakerDeckPlayers } from "./speakerdeck.ts";

export type MediaEmbed = {
  src: string;
  title: string;
  shape: "video" | "compact" | "tall";
  width: number;
  height: number;
};

export type { SpeakerDeckPlayers };

const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const youtubeShortHosts = new Set(["youtu.be", "www.youtu.be"]);
const spotifyHosts = new Set(["open.spotify.com", "www.open.spotify.com"]);
const spotifyTypes = new Set(["track", "album", "playlist", "episode", "show", "artist"]);
const videoId = /^[A-Za-z0-9_-]{11}$/;
const playlistId = /^[A-Za-z0-9_-]{10,80}$/;
const spotifyId = /^[A-Za-z0-9]{22}$/;

function httpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function youtubeSeconds(value: string): number | null {
  if (/^\d+$/.test(value)) return Number(value);
  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!parts || (!parts[1] && !parts[2] && !parts[3])) return null;
  return Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0);
}

function youtubeStart(url: URL): string | null {
  const start = url.searchParams.get("start");
  if (start && /^\d+$/.test(start)) return start;
  const t = url.searchParams.get("t");
  if (!t) return null;
  const seconds = youtubeSeconds(t);
  return seconds === null ? null : String(seconds);
}

function youtubeEmbed(id: string, list: string | null, start: string | null, videoseries: boolean): MediaEmbed {
  const params = new URLSearchParams();
  if (list) params.set("list", list);
  if (start) params.set("start", start);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const path = videoseries ? "videoseries" : id;
  return {
    src: `https://www.youtube-nocookie.com/embed/${path}${query}`,
    title: "YouTube",
    shape: "video",
    width: 560,
    height: 315,
  };
}

function youtubeFrom(url: URL): MediaEmbed | null {
  const host = url.hostname.toLowerCase();
  const start = youtubeStart(url);
  const list = url.searchParams.get("list");
  const playlist = list && playlistId.test(list) ? list : null;
  if (youtubeShortHosts.has(host)) {
    const id = url.pathname.split("/").filter((part) => part.length > 0)[0] ?? "";
    return videoId.test(id) ? youtubeEmbed(id, playlist, start, false) : null;
  }
  if (!youtubeHosts.has(host)) return null;
  const parts = url.pathname.split("/").filter((part) => part.length > 0);
  const head = parts[0] ?? "";
  const tail = parts[1] ?? "";
  if (head === "watch") {
    const id = url.searchParams.get("v") ?? "";
    if (videoId.test(id)) return youtubeEmbed(id, playlist, start, false);
    return playlist ? youtubeEmbed("", playlist, start, true) : null;
  }
  if ((head === "shorts" || head === "live" || head === "embed") && videoId.test(tail)) {
    return youtubeEmbed(tail, playlist, start, false);
  }
  if (head === "embed" && tail === "videoseries" && playlist) return youtubeEmbed("", playlist, start, true);
  if (head === "playlist" && playlist) return youtubeEmbed("", playlist, start, true);
  return null;
}

function spotifyFrom(url: URL): MediaEmbed | null {
  if (!spotifyHosts.has(url.hostname.toLowerCase())) return null;
  const parts = url.pathname.split("/").filter((part) => part.length > 0);
  if (parts[0]?.startsWith("intl-")) parts.shift();
  if (parts[0] === "embed") parts.shift();
  const type = parts[0] ?? "";
  const id = parts[1] ?? "";
  if (!spotifyTypes.has(type) || !spotifyId.test(id)) return null;
  const shape = type === "track" || type === "episode" ? "compact" : "tall";
  return {
    src: `https://open.spotify.com/embed/${type}/${id}`,
    title: "Spotify",
    shape,
    width: 560,
    height: shape === "compact" ? 152 : 352,
  };
}

function speakerDeckSrc(base: string | undefined, slide: string | null): string | null {
  if (!base || !/^https:\/\/speakerdeck\.com\/player\/[a-f0-9]{32}$/.test(base)) return null;
  return slide ? `${base}?slide=${slide}` : base;
}

function speakerDeckFrom(value: string, players: SpeakerDeckPlayers): MediaEmbed | null {
  const ref = speakerDeckRef(value);
  if (!ref) return null;
  const src = ref.kind === "player" ? ref.src : speakerDeckSrc(players[ref.key], ref.slide);
  if (!src) return null;
  return { src, title: "Speaker Deck", shape: "video", width: 710, height: 399 };
}

export function mediaEmbed(value: string, players: SpeakerDeckPlayers = {}): MediaEmbed | null {
  const url = httpUrl(value.trim());
  if (!url) return null;
  return youtubeFrom(url) ?? spotifyFrom(url) ?? speakerDeckFrom(value.trim(), players);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function mediaEmbedHtml(
  value: string,
  label: string | null,
  players: SpeakerDeckPlayers = {},
  loading: "lazy" | "eager" = "lazy",
): string | null {
  const embed = mediaEmbed(value, players);
  if (!embed) return null;
  const visible = label?.trim() ?? "";
  const titled = visible.length > 0 && !/^https?:\/\//i.test(visible);
  const title = titled ? visible : embed.title;
  const caption = titled ? `<span class="media-embed__label">${escapeHtml(visible)}</span>` : "";
  return `${caption}<iframe class="media-embed" data-shape="${embed.shape}" src="${escapeHtml(embed.src)}" title="${escapeHtml(title)}" width="${embed.width}" height="${embed.height}" loading="${loading}" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>`;
}
