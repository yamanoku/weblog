import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { markdownToHtml } from "../domain/markdown-html.ts";
import { mediaEmbedHtml } from "../domain/media-embed.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

test("a youtube or spotify link becomes an embed and the source url stays out of the frame", () => {
  const watch = markdownToHtml("[https://www.youtube.com/watch?v=H6L21sxYXic&t=96s](https://www.youtube.com/watch?v=H6L21sxYXic&t=96s)");
  assert.match(watch, /src="https:\/\/www\.youtube-nocookie\.com\/embed\/H6L21sxYXic\?start=96"/);
  assert.match(watch, /title="YouTube"/);
  assert.equal(watch.includes("<a "), false);
  assert.equal(watch.includes("t=96s"), false);

  const timed = markdownToHtml("https://youtu.be/izV1h6o3hgQ?t=3872");
  assert.match(timed, /src="https:\/\/www\.youtube-nocookie\.com\/embed\/izV1h6o3hgQ\?start=3872"/);

  const shorts = markdownToHtml("[short](https://www.youtube.com/shorts/csI5MHJ2fHo)");
  assert.match(shorts, /<span class="media-embed__label">short<\/span>/);
  assert.match(shorts, /title="short"/);
  assert.match(shorts, /\/embed\/csI5MHJ2fHo"/);

  const live = markdownToHtml("[live](https://www.youtube.com/live/OYZI8x1nTA1)");
  assert.match(live, /\/embed\/OYZI8x1nTA1"/);
  assert.match(live, /data-shape="video"/);

  const playlist = markdownToHtml(
    "[list](https://www.youtube.com/playlist?list=PLHsuZp6_Tsv9RZnyar7J7F8dpbHDwX5Uf)",
  );
  assert.match(playlist, /\/embed\/videoseries\?list=PLHsuZp6_Tsv9RZnyar7J7F8dpbHDwX5Uf"/);

  const track = markdownToHtml(
    "[https://open.spotify.com/intl-ja/track/6LqxXrRj27BMRh26IFueEg?si=72c0b2aea7d045c7](https://open.spotify.com/intl-ja/track/6LqxXrRj27BMRh26IFueEg?si=72c0b2aea7d045c7)",
  );
  assert.match(track, /src="https:\/\/open\.spotify\.com\/embed\/track\/6LqxXrRj27BMRh26IFueEg"/);
  assert.match(track, /data-shape="compact"/);
  assert.equal(track.includes("si="), false);

  const album = markdownToHtml("[album](https://open.spotify.com/album/0034RJKaIQVPPA581qxaif)");
  assert.match(album, /\/embed\/album\/0034RJKaIQVPPA581qxaif"/);
  assert.match(album, /data-shape="tall"/);

  const episode = mediaEmbedHtml("https://open.spotify.com/episode/0RV5CA9yu6GuBAs80nakTJ", null);
  assert.match(episode ?? "", /data-shape="compact"/);

  const code = markdownToHtml("```\nhttps://www.youtube.com/watch?v=H6L21sxYXic\n```\n\n`https://youtu.be/ewaIgoshD8U`");
  assert.equal(code.includes("<iframe"), false);
  assert.match(code, /https:\/\/www\.youtube\.com\/watch\?v=H6L21sxYXic/);
  assert.match(code, /https:\/\/youtu\.be\/ewaIgoshD8U/);

  const other = markdownToHtml("[channel](https://www.youtube.com/@yamanoku)\n\n[site](https://example.com/)");
  assert.equal(other.includes("<iframe"), false);
  assert.match(other, /<a href="https:\/\/www\.youtube\.com\/@yamanoku">channel<\/a>/);
  assert.match(other, /<a href="https:\/\/example\.com\/">site<\/a>/);

  const heading = readFileSync(join(rootDir, "ui/entry-heading.svelte"), "utf8");
  assert.match(heading, /mediaEmbedHtml\(href, null\)/);
});
