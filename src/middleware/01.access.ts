import { defineMiddleware } from "void";
import {
  accessAssertion,
  accessIssuer,
  editAccessDecision,
  importAccessPublicKey,
} from "../access/edit-gate.ts";

type EnvStore = { getStore?: () => unknown };

function rawEnv(): Record<string, unknown> | null {
  const globals = globalThis as unknown as Record<symbol, EnvStore | undefined>;
  const store = globals[Symbol.for("void.envContext.v1")];
  const value = store?.getStore?.();
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function readSetting(context: { env: unknown }, name: string): string {
  const sources = [rawEnv(), context.env];
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const value = (source as Record<string, unknown>)[name];
    if (typeof value === "string") return value.trim();
  }
  const proc = globalThis.process;
  const fromProcess = proc?.env?.[name];
  return typeof fromProcess === "string" ? fromProcess.trim() : "";
}

export default defineMiddleware(async (context, next) => {
  const material = readSetting(context, "ACCESS_PUBLIC_KEY");
  let publicKey = null;
  if (material.length > 0) {
    try {
      publicKey = await importAccessPublicKey(material);
    } catch {
      publicKey = null;
    }
  }
  const decision = await editAccessDecision(
    context.req.path,
    accessAssertion(
      context.req.header("Cf-Access-Jwt-Assertion") ?? "",
      context.req.header("cookie") ?? "",
    ),
    {
      ownerEmail: readSetting(context, "OWNER_EMAIL"),
      issuer: accessIssuer(readSetting(context, "ACCESS_TEAM_DOMAIN")),
      audience: readSetting(context, "ACCESS_AUD"),
      publicKey,
      now: Date.now(),
    },
  );
  if (!decision.ok) return context.text("Unauthorized", 401, { "cache-control": "no-store" });
  await next();
});
