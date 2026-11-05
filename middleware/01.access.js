import { defineMiddleware } from "void";
import {
  accessAssertion,
  accessIssuer,
  editAccessDecision,
  importAccessPublicKey,
} from "../access/edit-gate.js";

function rawEnv() {
  const store = globalThis[Symbol.for("void.envContext.v1")];
  const value = store?.getStore?.();
  return value && typeof value === "object" ? value : null;
}

function setting(context, name) {
  const sources = [rawEnv(), context.env];
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const value = source[name];
    if (typeof value === "string") return value.trim();
  }
  const proc = globalThis.process;
  const fromProcess = proc?.env?.[name];
  return typeof fromProcess === "string" ? fromProcess.trim() : "";
}

export default defineMiddleware(async (context, next) => {
  const material = setting(context, "ACCESS_PUBLIC_KEY");
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
      ownerEmail: setting(context, "OWNER_EMAIL"),
      issuer: accessIssuer(setting(context, "ACCESS_TEAM_DOMAIN")),
      audience: setting(context, "ACCESS_AUD"),
      publicKey,
      now: Date.now(),
    },
  );
  if (!decision.ok) return context.text("Unauthorized", 401, { "cache-control": "no-store" });
  await next();
});
