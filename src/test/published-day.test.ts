import assert from "node:assert/strict";
import { test } from "vitest";
import { groupByPublishedDay, tokyoPublishedDay } from "../domain/published-day.ts";

test("a published instant uses the Tokyo calendar date", () => {
  assert.deepEqual(tokyoPublishedDay("2026-11-19T15:00:00.000Z"), {
    date: "2026-11-20",
    label: "2026年11月20日",
  });
  assert.deepEqual(tokyoPublishedDay("2026-11-19T14:59:59.000Z"), {
    date: "2026-11-19",
    label: "2026年11月19日",
  });
  assert.equal(tokyoPublishedDay("not-a-time"), null);
});

test("home entries that share a Tokyo date stay in one section", () => {
  const groups = groupByPublishedDay([
    { id: "later", publishedAt: "2026-11-20T01:00:00.000Z" },
    { id: "same-day", publishedAt: "2026-11-20T00:30:00.000Z" },
    { id: "previous", publishedAt: "2026-11-19T01:00:00.000Z" },
  ]);
  assert.deepEqual(
    groups.map((group) => ({ date: group.date, ids: group.entries.map((entry) => entry.id) })),
    [
      { date: "2026-11-20", ids: ["later", "same-day"] },
      { date: "2026-11-19", ids: ["previous"] },
    ],
  );
  assert.equal(groups[0]?.label, "2026年11月20日");
});
