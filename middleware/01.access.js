import { defineMiddleware } from "void";
import { accessIssuer, editAccessDecision, importAccessPublicKey } from "../access/edit-gate.js";

function setting(context, name) {
  const bound = context.env?.[name];
  if (typeof bound === "string") return bound;
  if (typeof process !== "undefined" && typeof process.env?.[name] === "string")
    return process.env[name];
  return "";
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
    context.req.header("Cf-Access-Jwt-Assertion") ?? "",
    {
      ownerEmail: setting(context, "OWNER_EMAIL"),
      issuer: accessIssuer(setting(context, "ACCESS_TEAM_DOMAIN")),
      audience: setting(context, "ACCESS_AUD"),
      publicKey,
      now: Date.now(),
    },
  );
  if (!decision.ok) return context.text("Unauthorized", 401);
  await next();
});
