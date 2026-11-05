// Consent negotiation: which fields each capability unlocks. The key sets
// mirror the CLI's own pins (centrail-cli packages/cli/src/wire.test.ts
// "the wire allowlist" and "the fate-row allowlist"), so a field the CLI
// adds without adding it here fails one side or the other.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAPABILITIES, CAPABILITY_FIELDS, schema, validateAttributeBody, validateIngestBody } from "../src/index.js";
import { clone, load } from "./helpers.js";

const props = (def) => Object.keys(schema.$defs[def].properties).sort();
const gated = (def, cap) => Object.entries(CAPABILITY_FIELDS[def] ?? {}).filter(([, c]) => c === cap).map(([k]) => k).sort();
const ungated = (def) => props(def).filter((k) => !(k in (CAPABILITY_FIELDS[def] ?? {}))).sort();

// From wire.test.ts USAGE_KEYS and the 0.6 additions.
const USAGE_KEYS = [
  "externalId", "model", "inputTokens", "outputTokens", "cacheReadTokens",
  "cacheCreationTokens", "cacheWriteTokens", "cacheCreation5mTokens", "cacheCreation1hTokens", "occurredAt",
];
// From wire.test.ts "the fate-row allowlist".
const BASE_KEYS = ["repoName", "commitSha", "branch", "fate"];
const REPO_KEYS = ["repoKey", "mergedAs", "committedAt", "linesAdded", "linesDeleted", "filesChanged", "mine"];
const PATCH_KEYS = ["patchId", "branchPatchId"];

describe("the field groups match the CLI's pinned key sets", () => {
  it("events: the 0.5.1 allowlist is everything not gated", () => {
    assert.deepEqual(ungated("IngestEvent"), [...USAGE_KEYS].sort());
  });
  it("events: usage-extras, repo and billing-route", () => {
    assert.deepEqual(gated("IngestEvent", "usage-extras"), ["speed", "webSearchRequests"]);
    assert.deepEqual(gated("IngestEvent", "repo"), ["metadata"]);
    assert.deepEqual(gated("IngestEvent", "billing-route"), ["billingProvider", "serviceClass"]);
    assert.deepEqual(props("EventMetadata"), ["gitBranch", "origin", "placement", "repo", "sessionId"]);
    assert.deepEqual(props("RepoIdentity"), ["key", "label", "root", "source"]);
    assert.deepEqual(Object.keys(schema.$defs.EventMetadata.properties.origin.properties), ["machineId"]);
  });
  it("fate rows: base, repo and patch-id", () => {
    assert.deepEqual(ungated("Fate"), [...BASE_KEYS].sort());
    assert.deepEqual(gated("Fate", "repo"), [...REPO_KEYS].sort());
    assert.deepEqual(gated("Fate", "patch-id"), [...PATCH_KEYS].sort());
  });
  it("attribute route: repo keys and the facts envelope need repo", () => {
    assert.deepEqual(CAPABILITY_FIELDS.Repo, { key: "repo" });
    assert.deepEqual(CAPABILITY_FIELDS.Attribution, { repoKey: "repo" });
    assert.deepEqual(CAPABILITY_FIELDS.AttributeBody, { facts: "repo" });
  });
  it("every gate names a known capability", () => {
    for (const gates of Object.values(CAPABILITY_FIELDS)) {
      for (const cap of Object.values(gates)) assert.ok(CAPABILITIES.includes(cap), cap);
    }
  });
});

describe("a body carries only what was granted", () => {
  it("an unanswered scope ([]) is the 0.5.1 shape exactly", () => {
    for (const body of load("ingest-0.5.1")) assert.deepEqual(validateIngestBody(body, { fields: [] }), { valid: true });
    const r = validateIngestBody(load("ingest-0.6")[0], { fields: [] });
    assert.equal(r.valid, false);
    assert.match(r.errors[0], /^\/events\/0\/metadata requires capability "repo"$/);
  });
  it("usage extras need usage-extras", () => {
    const body = load("ingest-consented")[0];
    const r = validateIngestBody(body, { fields: ["repo"] });
    assert.deepEqual(r.valid ? [] : r.errors, [
      '/events/0/speed requires capability "usage-extras"',
      '/events/0/webSearchRequests requires capability "usage-extras"',
    ]);
  });
  it("a billing route needs billing-route", () => {
    const r = validateIngestBody(load("ingest-billing-route")[0], { fields: ["repo"] });
    assert.equal(r.valid, false);
    assert.ok(r.errors.every((e) => /requires capability "billing-route"$/.test(e)));
  });
  it("fate rows: patch ids need patch-id, facts need repo", () => {
    const body = load("attribute-0.6")[1];
    const onlyRepo = validateAttributeBody(body, { fields: ["repo", "match"] });
    assert.equal(onlyRepo.valid, false);
    assert.ok(onlyRepo.errors.every((e) => /requires capability "patch-id"$/.test(e)));
    const onlyPatch = validateAttributeBody(body, { fields: ["patch-id"] });
    assert.equal(onlyPatch.valid, false);
    assert.ok(onlyPatch.errors.some((e) => e === '/facts requires capability "repo"'));
    assert.ok(onlyPatch.errors.some((e) => e === '/repos/0/key requires capability "repo"'));
  });
  it("a fate row is the 0.5.1 four to a server that lists nothing", () => {
    const body = clone(load("attribute-0.5.1")[1]);
    assert.deepEqual(validateAttributeBody(body, { fields: [] }), { valid: true });
    body.fates[0].mine = true;
    assert.equal(validateAttributeBody(body, { fields: [] }).valid, false);
  });
  it("a matching server (repo + match) gets no attributions", () => {
    const body = clone(load("attribute-consented")[1]);
    assert.deepEqual(validateAttributeBody(body, { fields: ["repo"] }), { valid: true });
    assert.equal(validateAttributeBody(body, { fields: ["repo", "match"] }).valid, false);
  });
  it("without fields, capability checks are skipped (shape only)", () => {
    assert.deepEqual(validateIngestBody(load("ingest-0.6")[0]), { valid: true });
  });
});
