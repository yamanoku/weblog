import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { markdownToHtml } from "../domain/markdown-html.ts";
import { mediaEmbedHtml } from "../domain/media-embed.ts";
import { resolveSpeakerDeckPlayers } from "../domain/speakerdeck.ts";

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
  assert.match(heading, /mediaEmbedHtml\(href, null, speakerdeck, "eager"\)/);
  for (const page of ["pages/[title].svelte", "pages/e/[id].svelte"]) {
    const source = readFileSync(join(rootDir, page), "utf8");
    assert.match(source, /speakerdeck=\{entry\.speakerdeck \?\? \{\}\}/);
    assert.match(source, /markdownToHtml\(entry\.body, entry\.gyazo \?\? \{\}, entry\.speakerdeck \?\? \{\}\)/);
  }
});

const ramen = "https://speakerdeck.com/kousukeosanai/20261121-techramen";
const ramenPlayer = "https://speakerdeck.com/player/de97b1c4eba540f7b4fc778aa0c57099";

test("a speaker deck link becomes the player iframe when the player address is known", () => {
  const players = { [ramen]: ramenPlayer };
  const labeled = markdownToHtml(`[資料](${ramen})`, {}, players);
  assert.match(labeled, new RegExp(`src="${ramenPlayer}"`));
  assert.match(labeled, /title="資料"/);
  assert.match(labeled, /data-shape="video"/);
  assert.match(labeled, /width="710"/);
  assert.match(labeled, /loading="lazy"/);
  assert.equal(labeled.includes("<a "), false);

  const slide = markdownToHtml(`[slide](${ramen}?slide=15)`, {}, players);
  assert.match(slide, new RegExp(`src="${ramenPlayer}\\?slide=15"`));

  const direct = markdownToHtml(ramenPlayer);
  assert.match(direct, new RegExp(`src="${ramenPlayer}"`));

  const www = markdownToHtml(`http://www.speakerdeck.com/kousukeosanai/20261121-techramen`, {}, players);
  assert.match(www, new RegExp(`src="${ramenPlayer}"`));

  const unknown = markdownToHtml(`[deck](${ramen})`);
  assert.match(unknown, new RegExp(`<a href="${ramen}">deck</a>`));
  assert.equal(unknown.includes("<iframe"), false);

  const profile = markdownToHtml("[profile](https://speakerdeck.com/kousukeosanai)", {}, players);
  assert.match(profile, /<a href="https:\/\/speakerdeck\.com\/kousukeosanai">profile<\/a>/);

  const code = markdownToHtml("```\n" + ramen + "\n```\n\n`" + ramen + "`", {}, players);
  assert.equal(code.includes("<iframe"), false);
  assert.match(code, new RegExp(ramen.replaceAll("/", "\\/")));
});

test("speaker deck oembed keeps only a player src on speakerdeck.com", async () => {
  let asked = "";
  const players = await resolveSpeakerDeckPlayers([`see ${ramen}.`], async (input) => {
    asked = String(input);
    return new Response(
      JSON.stringify({
        html: `<iframe src="${ramenPlayer}"></iframe><iframe src="https://evil.example/player/de97b1c4eba540f7b4fc778aa0c57099"></iframe>`,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
  assert.match(asked, /https:\/\/speakerdeck\.com\/oembed\.json\?url=/);
  assert.match(asked, /kousukeosanai%2F20261121-techramen/);
  assert.equal(players[ramen], ramenPlayer);

  const refused = await resolveSpeakerDeckPlayers([ramen], async () => new Response("no", { status: 500 }));
  assert.deepEqual(refused, {});

  const profile = await resolveSpeakerDeckPlayers(["https://speakerdeck.com/kousukeosanai"], async () => {
    throw new Error("profile urls are not asked");
  });
  assert.deepEqual(profile, {});
});
