import { HTTPException } from "hono/http-exception";
import { catalogMonthHrefs } from "../domain/catalog.ts";
import { postedNoteUrl } from "../domain/edit-note.ts";
import {
  monthDocumentTitle,
  monthHref,
  monthLabel,
  monthWeeks,
  parseHomeMonth,
  shiftMonth,
  tokyoDate,
} from "../domain/home-calendar.ts";
import { defineHandler } from "void";
import { verifiedOwner } from "../middleware/01.access.ts";
import { editArticleDatabase } from "../store/edit-article.ts";
import { listMonthDiaryHrefs, readStoredEntry } from "../store/entries.ts";
import { readsDevCatalog } from "../store/read-source.ts";

function rejectHomeMonth(raw: string | undefined, now: Date) {
  const month = parseHomeMonth(raw, now);
  if (month) return month;
  throw new HTTPException(400, {
    res: new Response("invalid_month", {
      status: 400,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    }),
  });
}

export const loader = defineHandler(async (c) => {
  const now = new Date();
  const month = rejectHomeMonth(c.req.query("month"), now);
  // Local `vp dev` has no Access login. A deployed home page includes the field only for the owner.
  const owner = readsDevCatalog() || (await verifiedOwner(c));
  if (owner) {
    c.header("cache-control", "private, no-store");
    c.header("vary", "Cookie");
  }
  const postedId = owner ? (c.req.query("posted") ?? "") : "";
  const postedEntry =
    postedId === "" || readsDevCatalog()
      ? null
      : await readStoredEntry(editArticleDatabase(), postedId);
  const postedNote = postedNoteUrl(postedEntry);
  const today = tokyoDate(now);
  const todayMonth = parseHomeMonth(undefined, now);
  if (!todayMonth) throw new HTTPException(400, { message: "invalid_month" });
  const hrefs = readsDevCatalog()
    ? catalogMonthHrefs(month)
    : await listMonthDiaryHrefs(editArticleDatabase(), month);
  return {
    owner,
    postedNote,
    documentTitle: monthDocumentTitle(month),
    label: monthLabel(month),
    previousHref: monthHref(shiftMonth(month, -1), todayMonth),
    nextHref: monthHref(shiftMonth(month, 1), todayMonth),
    weeks: monthWeeks(month, hrefs, today),
  };
});
