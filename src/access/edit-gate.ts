const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type AccessPublicKey = {
  keys: Array<{ kid: string; key: CryptoKey }>;
};

export type AccessSettings = {
  ownerEmail: string;
  issuer: string;
  audience: string | readonly string[];
  publicKey: AccessPublicKey | null;
  now?: number;
};

export type AccessDecision = {
  ok: boolean;
  status?: 401;
  reason?: string;
  skipped?: true;
};

type AccessJwk = {
  kty?: string;
  alg?: string;
  kid?: string;
  n?: string;
  e?: string;
};

type TokenHeader = {
  alg?: unknown;
  kid?: unknown;
};

type TokenClaims = {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  email?: unknown;
};

export function editPathNeedsAccess(path: string): boolean {
  return path === "/edit" || path.startsWith("/edit/");
}

export function accessAssertion(header: string, cookie: string): string {
  if (typeof header === "string" && header.length > 0) return header;
  if (typeof cookie !== "string" || cookie.length === 0) return "";
  const match = /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(cookie);
  if (!match) return "";
  const captured = match[1];
  if (captured === undefined) return "";
  try {
    return decodeURIComponent(captured);
  } catch {
    return captured;
  }
}

export function accessIssuer(teamDomain: string): string {
  if (typeof teamDomain !== "string" || teamDomain.length === 0) return "";
  return `https://${teamDomain}.cloudflareaccess.com`;
}

function asciiCaseFold(value: string): string {
  let folded = "";
  for (const character of value) {
    const code = character.charCodeAt(0);
    folded += code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : character;
  }
  return folded;
}

function decodeBase64Url(segment: string): Uint8Array {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeJson(segment: string): unknown {
  return JSON.parse(decoder.decode(decodeBase64Url(segment))) as unknown;
}

function audienceValues(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function audienceMatches(tokenAudience: unknown, configuredAudience: unknown): boolean {
  const wanted = audienceValues(configuredAudience);
  const present = audienceValues(tokenAudience);
  if (wanted.length === 0 || present.length === 0) return false;
  return present.some((item) => wanted.includes(item));
}

function rsaVerificationKey(jwk: unknown): jwk is AccessJwk {
  if (typeof jwk !== "object" || jwk === null) return false;
  const record = jwk as AccessJwk;
  return record.kty === "RSA" && (record.alg === "RS256" || record.alg == null);
}

function copiedBytes(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

async function importRsaJwk(jwk: AccessJwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

export async function importAccessPublicKey(material: string): Promise<AccessPublicKey> {
  const trimmed = material.trim();
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as { keys?: unknown };
    const jwks = Array.isArray(parsed.keys) ? parsed.keys : [parsed];
    const keys: AccessPublicKey["keys"] = [];
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

function keyForKid(publicKey: AccessPublicKey | null, kid: unknown): CryptoKey | null {
  const keys = publicKey?.keys;
  if (!Array.isArray(keys) || keys.length === 0) return null;
  if (typeof kid === "string" && kid.length > 0) {
    return keys.find((item) => item.kid === kid)?.key ?? null;
  }
  const only = keys[0];
  if (keys.length === 1 && only !== undefined && only.kid === "") return only.key;
  return null;
}

function deny(reason: string): AccessDecision {
  return { ok: false, status: 401, reason };
}

export async function decideEditAccess({
  header,
  ownerEmail,
  issuer,
  audience,
  publicKey,
  now,
}: {
  header: string;
  ownerEmail: string;
  issuer: string;
  audience: AccessSettings["audience"];
  publicKey: AccessPublicKey | null;
  now?: number;
}): Promise<AccessDecision> {
  if (typeof header !== "string" || header.length === 0) return deny("header");
  if (typeof ownerEmail !== "string" || ownerEmail.length === 0) return deny("owner");
  if (typeof issuer !== "string" || issuer.length === 0) return deny("issuer");
  if (audienceValues(audience).length === 0) return deny("audience");
  if (!Array.isArray(publicKey?.keys) || publicKey.keys.length === 0) return deny("key");

  const parts = header.split(".");
  if (parts.length !== 3) return deny("parts");
  const encodedHeader = parts[0];
  const encodedClaims = parts[1];
  const encodedSignature = parts[2];
  if (encodedHeader === undefined || encodedClaims === undefined || encodedSignature === undefined) {
    return deny("parts");
  }

  let parsedHeader: TokenHeader;
  let claims: TokenClaims;
  try {
    parsedHeader = decodeJson(encodedHeader) as TokenHeader;
    claims = decodeJson(encodedClaims) as TokenClaims;
  } catch {
    return deny("json");
  }
  if (parsedHeader.alg !== "RS256") return deny("alg");
  const verificationKey = keyForKid(publicKey, parsedHeader.kid);
  if (!verificationKey) return deny("kid");

  let signature: Uint8Array;
  try {
    signature = decodeBase64Url(encodedSignature);
  } catch {
    return deny("signature-encoding");
  }

  let signed = false;
  try {
    signed = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      verificationKey,
      copiedBytes(signature),
      encoder.encode(`${encodedHeader}.${encodedClaims}`),
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

export async function editAccessDecision(
  path: string,
  header: string,
  settings: AccessSettings,
): Promise<AccessDecision> {
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
