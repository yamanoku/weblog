import { defineHandler } from "void";
import { gyazoContentType, parseGyazoPath } from "../../domain/gyazo.ts";
import { editArticleDatabase } from "../../store/edit-article.ts";
import { readGyazoObject } from "../../store/gyazo-objects.ts";

type GyazoBucket = {
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
  } | null>;
};

function textResponse(status: number, body: string, cacheControl: string): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": cacheControl,
    },
  });
}

function gyazoBucket(value: unknown): GyazoBucket | null {
  if (!value || typeof value !== "object" || typeof (value as GyazoBucket).get !== "function") return null;
  return value as GyazoBucket;
}

export const GET = defineHandler(async (c) => {
  const parsed = parseGyazoPath(c.req.param("file") ?? "");
  if (!parsed) return textResponse(404, "", "no-store");
  const bucket = gyazoBucket(c.env.GYAZO_BUCKET);
  if (!bucket) return textResponse(503, "store_unavailable", "no-store");
  let row: { objectKey: string } | null;
  try {
    row = await readGyazoObject(editArticleDatabase(), parsed.imageId, parsed.extension);
  } catch {
    return textResponse(503, "store_unavailable", "no-store");
  }
  if (!row) return textResponse(404, "", "no-store");
  let object: Awaited<ReturnType<GyazoBucket["get"]>>;
  try {
    object = await bucket.get(row.objectKey);
  } catch {
    return textResponse(503, "store_unavailable", "no-store");
  }
  if (!object) return textResponse(404, "", "no-store");
  return new Response(object.body, {
    status: 200,
    headers: {
      "content-type": gyazoContentType(parsed.extension, object.httpMetadata?.contentType ?? null),
      "cache-control": "public, max-age=86400",
    },
  });
});
