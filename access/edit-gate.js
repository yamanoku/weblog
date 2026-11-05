const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function editPathNeedsAccess(path) {
  return path === "/edit" || path.startsWith("/edit/");
}

export function accessAssertion(header, cookie) {
  if (typeof header === "string" && header.length > 0) return header;
  if (typeof cookie !== "string" || cookie.length === 0) return "";
  const match = /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(cookie);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function accessIssuer(teamDomain) {
  if (typeof teamDomain !== "string" || teamDomain.length === 0) return "";
  return `https://${teamDomain}.cloudflareaccess.com`;
}

function asciiCaseFold(value) {
  let folded = "";
  for (const character of value) {
    const code = character.charCodeAt(0);
    folded += code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : character;
  }
  return folded;
}

function decodeBase64Url(segment) {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeJson(segment) {
  return JSON.parse(decoder.decode(decodeBase64Url(segment)));
}

function audienceValues(value) {
  if (typeof value === "string" && value.length > 0) return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.length > 0);
}

function audienceMatches(tokenAudience, configuredAudience) {
  const wanted = audienceValues(configuredAudience);
  const present = audienceValues(tokenAudience);
  if (wanted.length === 0 || present.length === 0) return false;
  return present.some((item) => wanted.includes(item));
}

function rsaVerificationKey(jwk) {
  return jwk?.kty === "RSA" && (jwk.alg === "RS256" || jwk.alg == null);
}

async function importRsaJwk(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

export async function importAccessPublicKey(material) {
  const trimmed = material.trim();
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    const jwks = Array.isArray(parsed.keys) ? parsed.keys : [parsed];
    const keys = [];
    for (const jwk of jwks) {
      if (!rsaVerificationKey(jwk)) continue;
      keys.push({
        kid: typeof jwk.kid === "string" ? jwk.kid : "",
        key: await importRsaJwk(jwk),
      });
    }
    if (keys.length === 0) throw new Error("Access public key is missing an RSA JWK");
    return { keys };
  }
  const body = trimmed
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s/g, "");
  const bytes = Uint8Array.from(atob(body), (character) => character.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "spki",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return { keys: [{ kid: "", key }] };
}

function keyForKid(publicKey, kid) {
  const keys = publicKey?.keys;
  if (!Array.isArray(keys) || keys.length === 0) return null;
  if (typeof kid === "string" && kid.length > 0) {
    return keys.find((item) => item.kid === kid)?.key ?? null;
  }
  if (keys.length === 1 && keys[0].kid === "") return keys[0].key;
  return null;
}

function deny(reason) {
  return { ok: false, status: 401, reason };
}

export async function decideEditAccess({ header, ownerEmail, issuer, audience, publicKey, now }) {
  if (typeof header !== "string" || header.length === 0) return deny("header");
  if (typeof ownerEmail !== "string" || ownerEmail.length === 0) return deny("owner");
  if (typeof issuer !== "string" || issuer.length === 0) return deny("issuer");
  if (audienceValues(audience).length === 0) return deny("audience");
  if (!Array.isArray(publicKey?.keys) || publicKey.keys.length === 0) return deny("key");

  const parts = header.split(".");
  if (parts.length !== 3) return deny("parts");

  let tokenHeader;
  let claims;
  try {
    tokenHeader = decodeJson(parts[0]);
    claims = decodeJson(parts[1]);
  } catch {
    return deny("json");
  }
  if (tokenHeader.alg !== "RS256") return deny("alg");
  const verificationKey = keyForKid(publicKey, tokenHeader.kid);
  if (!verificationKey) return deny("kid");

  let signature;
  try {
    signature = decodeBase64Url(parts[2]);
  } catch {
    return deny("signature-encoding");
  }

  let signed = false;
  try {
    signed = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      verificationKey,
      signature,
      encoder.encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    return deny("verify");
  }
  if (!signed) return deny("signature");
  if (claims.iss !== issuer) return deny("iss");
  if (!audienceMatches(claims.aud, audience)) return deny("aud");

  const nowMs = typeof now === "number" ? now : Date.now();
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= nowMs) return deny("exp");
  if (typeof claims.email !== "string" || claims.email.length === 0) return deny("email");
  if (asciiCaseFold(claims.email) !== asciiCaseFold(ownerEmail)) return deny("email");
  return { ok: true };
}

export async function editAccessDecision(path, header, settings) {
  if (!editPathNeedsAccess(path)) return { ok: true, skipped: true };
  const decision = await decideEditAccess({
    header,
    ownerEmail: settings.ownerEmail,
    issuer: settings.issuer,
    audience: settings.audience,
    publicKey: settings.publicKey,
    now: settings.now,
  });
  return decision.ok ? { ok: true } : { ok: false, status: 401, reason: decision.reason };
}
