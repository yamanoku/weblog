import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import {
  accessIssuer,
  accessAssertion,
  decideEditAccess,
  editAccessDecision,
  importAccessPublicKey,
} from "../access/edit-gate.js";
import { importWalkProject } from "../db/schema.ts";
import { commitEntry } from "../store/entries.js";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const projectDir = fileURLToPath(new URL("../..", import.meta.url));
const now = 1_700_000_000_000;
const ownerEmail = "owner@example.com";
const audience = "test-aud";
const issuer = accessIssuer("team.example");

function readRoot(path) {
  return readFileSync(join(rootDir, path), "utf8");
}

function readProject(path) {
  return readFileSync(join(projectDir, path), "utf8");
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".void" || name === "dist") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function applyShippedMigrations() {
  const directory = join(rootDir, "db/migrations");
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  assert.equal(files.length > 0, true);
  const sqlite = new Database(":memory:");
  for (const name of files) {
    const statements = readFileSync(join(directory, name), "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);
    for (const statement of statements) sqlite.exec(statement);
  }
  return sqlite;
}

function tableSql(sqlite, name) {
  const row = sqlite.prepare("SELECT sql FROM sqlite_master WHERE name = ?").get(name);
  assert.equal(typeof row?.sql, "string", name);
  return row.sql;
}

function columns(sqlite, name) {
  return sqlite.prepare(`PRAGMA table_info(${JSON.stringify(name)})`).all();
}

function primaryKey(sqlite, name) {
  return columns(sqlite, name)
    .filter((column) => column.pk > 0)
    .sort((left, right) => left.pk - right.pk)
    .map((column) => column.name);
}

async function keyPair() {
  return crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
}

function base64Url(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function signJwt(privateKey, payload, header = { alg: "RS256", typ: "JWT" }) {
  const encodedHeader = base64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  return `${encodedHeader}.${encodedPayload}.${base64Url(signature)}`;
}

function settings(publicKey) {
  return { ownerEmail, issuer, audience, publicKey, now };
}

test("the shipped migration creates the database.md tables, keys, and indexes", () => {
  const sqlite = applyShippedMigrations();
  const tables = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => row.name);
  assert.deepEqual(tables, [
    "activities",
    "delivery_jobs",
    "delivery_records",
    "delivery_targets",
    "edges",
    "entries",
    "followers",
    "gyazo_objects",
    "import_walk",
    "import_write_tally",
    "kv_write_tally",
    "owner_token",
    "past_titles",
    "path_redirects",
    "queue_op_tally",
    "tombstones",
  ]);

  assert.deepEqual(
    columns(sqlite, "entries").map((column) => column.name),
    [
      "id",
      "kind",
      "title",
      "body",
      "visibility",
      "bookmark_url",
      "published_at",
      "cosense_page_id",
      "created_at",
      "updated_at",
      "view_path",
      "last_imported_body",
      "source_updated_at",
    ],
  );
  assert.deepEqual(primaryKey(sqlite, "entries"), ["id"]);
  assert.match(
    tableSql(sqlite, "entries_feed"),
    /visibility = 'public' AND published_at IS NOT NULL/,
  );
  assert.match(tableSql(sqlite, "entries_titles"), /visibility = 'public' AND title <> ''/);
  assert.match(tableSql(sqlite, "entries_view_path_unique"), /UNIQUE/i);
  assert.match(tableSql(sqlite, "entries_cosense_page_id_unique"), /UNIQUE/i);

  assert.deepEqual(
    columns(sqlite, "edges").map((column) => column.name),
    ["source_id", "written_title", "target_id"],
  );
  assert.deepEqual(primaryKey(sqlite, "edges"), []);
  assert.match(tableSql(sqlite, "edges_source_id"), /source_id/);
  assert.match(tableSql(sqlite, "edges_written_title"), /written_title/);

  assert.deepEqual(primaryKey(sqlite, "past_titles"), ["entry_id", "title"]);
  assert.match(tableSql(sqlite, "past_titles_title"), /title/);
  assert.deepEqual(primaryKey(sqlite, "path_redirects"), ["path_key"]);
  assert.deepEqual(
    columns(sqlite, "owner_token").map((column) => column.name),
    ["hash", "issued_at"],
  );
  assert.deepEqual(primaryKey(sqlite, "owner_token"), []);
  assert.deepEqual(primaryKey(sqlite, "delivery_records"), ["entry_id"]);
  assert.deepEqual(
    columns(sqlite, "tombstones").map((column) => column.name),
    ["entry_id", "deleted_at"],
  );
  assert.deepEqual(primaryKey(sqlite, "tombstones"), []);
  assert.deepEqual(primaryKey(sqlite, "gyazo_objects"), ["image_id", "extension"]);
  assert.match(tableSql(sqlite, "activities_outbox"), /published_at" desc/i);
  assert.match(tableSql(sqlite, "activities_outbox"), /"id" desc/i);
  assert.deepEqual(primaryKey(sqlite, "delivery_jobs"), ["activity_id"]);
  assert.deepEqual(primaryKey(sqlite, "delivery_targets"), ["activity_id", "actor_id"]);
  assert.deepEqual(primaryKey(sqlite, "followers"), ["actor_id"]);
  assert.deepEqual(primaryKey(sqlite, "queue_op_tally"), ["utc_date"]);
  assert.deepEqual(primaryKey(sqlite, "kv_write_tally"), ["utc_date"]);
  assert.deepEqual(primaryKey(sqlite, "import_walk"), ["project"]);
  assert.equal(importWalkProject, "yamanoku");
  assert.deepEqual(primaryKey(sqlite, "import_write_tally"), ["utc_date"]);
  sqlite.close();
});

test("commitEntry reads back the entries row it writes", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const saved = await commitEntry(database, {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "note",
    title: "stored-note",
    body: "plain text",
    visibility: "draft",
    createdAt: "2026-11-04T00:00:00Z",
    updatedAt: "2026-11-04T00:00:00Z",
  });
  assert.deepEqual(saved, {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "note",
    title: "stored-note",
    body: "plain text",
    visibility: "draft",
  });
  sqlite.close();
});

test("edit access accepts only a verified owner JWT on /edit and /edit/*", async () => {
  const pair = await keyPair();
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const publicKey = await importAccessPublicKey(JSON.stringify(jwk));
  const claims = {
    iss: issuer,
    aud: audience,
    exp: 1_700_000_060,
    email: "Owner@Example.COM",
  };
  const token = await signJwt(pair.privateKey, claims);
  const accepted = await decideEditAccess({ header: token, ...settings(publicKey) });
  assert.equal(accepted.ok, true);
  assert.equal((await editAccessDecision("/edit", token, settings(publicKey))).ok, true);
  assert.equal(
    (await editAccessDecision("/edit/entry-morning-note", token, settings(publicKey))).ok,
    true,
  );

  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  const flipped = encodedSignature[0] === "A" ? "B" : "A";
  const broken = `${encodedHeader}.${encodedPayload}.${flipped}${encodedSignature.slice(1)}`;
  assert.equal((await decideEditAccess({ header: broken, ...settings(publicKey) })).status, 401);
  assert.equal(
    (
      await decideEditAccess({
        header: await signJwt(pair.privateKey, { ...claims, aud: "other-aud" }),
        ...settings(publicKey),
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await decideEditAccess({
        header: await signJwt(pair.privateKey, { ...claims, exp: 1_700_000_000 }),
        ...settings(publicKey),
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await decideEditAccess({
        header: await signJwt(pair.privateKey, { ...claims, email: "other@example.com" }),
        ...settings(publicKey),
      })
    ).status,
    401,
  );
  assert.equal((await editAccessDecision("/edit", "", settings(publicKey))).status, 401);
  assert.equal(
    (await editAccessDecision("/edit/entry-morning-note", "", settings(publicKey))).status,
    401,
  );

  for (const path of [
    "/",
    "/pages",
    "/morning-note",
    "/e/entry-morning-note",
    "/entries",
    "/editor",
  ]) {
    const decision = await editAccessDecision(path, "", settings(null));
    assert.equal(decision.ok, true, path);
    assert.equal(decision.skipped, true, path);
  }
});

test("access assertion prefers the header and otherwise reads the cookie", () => {
  assert.equal(accessAssertion("header-token", "CF_Authorization=cookie-token"), "header-token");
  assert.equal(
    accessAssertion("", "other=1; CF_Authorization=cookie-token; theme=light"),
    "cookie-token",
  );
  assert.equal(accessAssertion("", ""), "");
});

test("edit access verifies with the certificate whose kid matches", async () => {
  const previous = await keyPair();
  const current = await keyPair();
  const previousJwk = await crypto.subtle.exportKey("jwk", previous.publicKey);
  const currentJwk = await crypto.subtle.exportKey("jwk", current.publicKey);
  previousJwk.kid = "previous";
  previousJwk.alg = "RS256";
  currentJwk.kid = "current";
  currentJwk.alg = "RS256";
  const publicKey = await importAccessPublicKey(
    JSON.stringify({ keys: [previousJwk, currentJwk] }),
  );
  const claims = {
    iss: issuer,
    aud: audience,
    exp: 1_700_000_060,
    email: ownerEmail,
  };
  const currentToken = await signJwt(current.privateKey, claims, {
    alg: "RS256",
    typ: "JWT",
    kid: "current",
  });
  assert.equal((await decideEditAccess({ header: currentToken, ...settings(publicKey) })).ok, true);
  const previousToken = await signJwt(previous.privateKey, claims, {
    alg: "RS256",
    typ: "JWT",
    kid: "previous",
  });
  assert.equal((await decideEditAccess({ header: previousToken, ...settings(publicKey) })).ok, true);
  const labeledWithTheOtherKey = await signJwt(current.privateKey, claims, {
    alg: "RS256",
    typ: "JWT",
    kid: "previous",
  });
  assert.equal(
    (await decideEditAccess({ header: labeledWithTheOtherKey, ...settings(publicKey) })).status,
    401,
  );
  const unknownKid = await signJwt(current.privateKey, claims, {
    alg: "RS256",
    typ: "JWT",
    kid: "missing",
  });
  assert.equal((await decideEditAccess({ header: unknownKid, ...settings(publicKey) })).status, 401);
  const noKid = await signJwt(current.privateKey, claims);
  assert.equal((await decideEditAccess({ header: noKid, ...settings(publicKey) })).status, 401);
});

test("domain and pages stay free of the store and the Access check", () => {
  const forbidden = [
    /void\/db/,
    /cloudflare:/,
    /@cloudflare\//,
    /decideEditAccess/,
    /Cf-Access-Jwt-Assertion/,
  ];
  for (const file of walk(join(rootDir, "domain"))) {
    const source = readFileSync(file, "utf8");
    for (const pattern of forbidden) assert.equal(pattern.test(source), false, file);
  }
  for (const file of walk(join(rootDir, "pages"))) {
    const source = readFileSync(file, "utf8");
    for (const pattern of [...forbidden, /importAccessPublicKey/]) {
      assert.equal(pattern.test(source), false, file);
    }
  }
  const config = readProject("void.config.ts");
  assert.match(config, /sourceDir:\s*"src"/);
  assert.match(config, /name:\s*"weblog"/);
  assert.match(config, /binding:\s*"DB"/);
  assert.match(config, /database_name:\s*"weblog"/);
  assert.match(config, /database_id:\s*"3ca9f890-f6a1-4bdd-973d-e3a72b0004f3"/);
  assert.equal(config.includes("kv_namespaces"), false);
  assert.equal(config.includes("r2_buckets"), false);
  assert.equal(config.includes("queues"), false);
  assert.equal(config.includes("durable_objects"), false);
  assert.equal(config.includes("crons"), false);
  assert.match(readRoot("pages/index.svelte"), /weblog\.yamanoku\.net/);
  assert.equal(readRoot("pages/index.svelte").includes("OWNER_EMAIL"), false);
  assert.match(readRoot("middleware/01.access.js"), /editAccessDecision/);
  assert.match(readRoot("middleware/01.access.js"), /Cf-Access-Jwt-Assertion/);
});
