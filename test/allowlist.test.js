// The never-uploaded list, as tests. Two halves:
//   1. No key outside the contract is accepted anywhere, so content cannot
//      ride along under a new name (the CLI's "stuffed event" tests, wire.test.ts).
//   2. The keys that are allowed cannot carry forbidden values: a path where
//      a repo key goes, a hostname where the install id goes, a commit
//      message where a sha goes.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateAttributeBody,
  validateImportBody,
  validateIngestBody,
  validatePairBody,
  validatePairPollBody,
} from "../src/index.js";
import { clone, load } from "./helpers.js";

// What the CLI's own privacy tests stuff into parsed events and fates
// (centrail-cli packages/cli/src/wire.test.ts, wire.privacy.test.ts), by kind.
const FORBIDDEN = {
  prompt: "PRIVATE_PROMPT: explain my medical invoice",
  completion: "PRIVATE_RESPONSE: confidential answer",
  response: "PRIVATE_RESPONSE",
  content: "PRIVATE_CODE: const customer = 'confidential'",
  thinking: "PRIVATE_REASONING",
  code: "PRIVATE_CODE",
  diff: "PRIVATE_DIFF: + confidential change",
  patch: "*** Begin Patch",
  commitMessage: "COMMIT-MESSAGE",
  message: "COMMIT-MESSAGE",
  subject: "COMMIT-MESSAGE",
  cwd: "/Users/jane/work/repo",
  path: "/home/PRIVATE_PERSON/Private Client",
  filePath: "C:\\Users\\PRIVATE_PERSON\\PRIVATE_FILE.ts",
  file_path: "/Users/jane/work/repo/touched-file.ts",
  workingDirectory: "/mnt/c/Users/PRIVATE_PERSON",
  localPath: "/Users/jane/work/repo",
  touched: { writes: ["/Users/jane/work/repo/touched-file.ts"], reads: [] },
  toolInput: { file_path: "/x", content: "PRIVATE_CODE" },
  toolOutput: "PRIVATE_DIFF",
  tool_use: { name: "Write", input: {} },
  arguments: '{"cmd":"cat secret"}',
  url: "https://github.com/acme/private-repo.git",
  remoteUrl: "git@github.com:acme/private-repo.git",
  host: "janes-mbp",
  platform: "darwin",
  email: "jane@acme.com",
  authorEmail: "jane@acme.com",
  account: { emailAddress: "jane@acme.com", organizationUuid: "org-uuid-1", accountUuid: "acct-uuid-1" },
  organizationUuid: "org-uuid-1",
  encrypted_content: "PRIVATE_ENCRYPTED_CONTENT",
  credentials: "PRIVATE_PROVIDER_CREDENTIAL",
  env: { PROVIDER_KEY: "PRIVATE_PROVIDER_CREDENTIAL" },
  turn: "turn-7",
  version: "9.9.9",
  entrypoint: "claude-vscode",
  client: "claude-vscode",
  clientVersion: "9.9.9",
  provider: "anthropic",
  raw: { anything: "PRIVATE_" },
};

const ingest = () => clone(load("ingest-consented")[0]);
const ingestPi = () => clone(load("ingest-billing-route")[0]);
const attribution = () => clone(load("attribute-0.5.1")[0]);
const fates = () => clone(load("attribute-0.6")[0]);

// Every object a body is made of: [where, validator, build, pick the object].
const LOCATIONS = [
  ["ingest body", validateIngestBody, ingest, (b) => b],
  ["ingest source", validateIngestBody, ingest, (b) => b.source],
  ["ingest event", validateIngestBody, ingest, (b) => b.events[0]],
  ["ingest event (billing route)", validateIngestBody, ingestPi, (b) => b.events[0]],
  ["event metadata", validateIngestBody, ingest, (b) => b.events[0].metadata],
  ["event metadata.repo", validateIngestBody, ingest, (b) => b.events[0].metadata.repo],
  ["event metadata.origin", validateIngestBody, ingest, (b) => b.events[0].metadata.origin],
  ["attribute body", validateAttributeBody, fates, (b) => b],
  ["attribute repos[]", validateAttributeBody, fates, (b) => b.repos[0]],
  ["attribute attributions[]", validateAttributeBody, attribution, (b) => b.attributions[0]],
  ["attribute fates[]", validateAttributeBody, fates, (b) => b.fates[0]],
  ["attribute facts", validateAttributeBody, fates, (b) => b.facts],
  ["pair body", validatePairBody, () => clone(load("pair")[1]), (b) => b],
  ["pair poll body", validatePairPollBody, () => clone(load("pair-poll")[0]), (b) => b],
  ["import body", validateImportBody, () => clone(load("import")[0]), (b) => b],
  ["import rows[]", validateImportBody, () => clone(load("import")[0]), (b) => b.rows[0]],
];

describe("no key outside the contract is accepted", () => {
  for (const [where, validate, build, pick] of LOCATIONS) {
    it(`${where}: every forbidden key is rejected`, () => {
      assert.deepEqual(validate(build()), { valid: true }, "the base body is valid");
      for (const [key, value] of Object.entries(FORBIDDEN)) {
        const body = build();
        const target = pick(body);
        if (Object.hasOwn(target, key)) continue; // a contract key here; covered by value tests
        target[key] = value;
        const result = validate(body);
        assert.equal(result.valid, false, `${where}.${key} must be rejected`);
      }
    });
  }

  it("the hostname slot on pair is the fixed label, never the machine's name", () => {
    assert.equal(validatePairBody({ hostname: "janes-mbp" }).valid, false);
    assert.equal(validatePairBody({ hostname: "Centrail CLI", platform: "darwin" }).valid, false);
  });
});

// [what, validator, build, mutate]
const VALUES = [
  // Paths and URLs where a repo key goes.
  ...[
    "/Users/jane/work/repo",
    "/home/PRIVATE_PERSON/Private Client",
    "C:\\Users\\PRIVATE_PERSON\\repo",
    "\\\\PRIVATE_HOST\\Users\\repo",
    "home/alice/repo",
    "https://github.com/acme/repo",
    "git@github.com:acme/repo.git",
    "GitHub.com/Acme/Repo",
    "github.com/acme/../repo",
    "github.com",
    "dir:/Users/jane",
    "hidden:jane",
  ].flatMap((key) => [
    [`event repo key ${JSON.stringify(key)}`, validateIngestBody, ingest, (b) => { b.events[0].metadata.repo.key = key; }],
    [`repos[].key ${JSON.stringify(key)}`, validateAttributeBody, fates, (b) => { b.repos[0].key = key; }],
    [`fates[].repoKey ${JSON.stringify(key)}`, validateAttributeBody, fates, (b) => { b.fates[0].repoKey = key; }],
  ]),
  // A label or repo name is a basename: never a path.
  ["repo label as a POSIX path", validateIngestBody, ingest, (b) => { b.events[0].metadata.repo = { key: "github.com/acme/a", label: "/Users/jane/a", source: "remote" }; }],
  ["repo label as a Windows path", validateIngestBody, ingest, (b) => { b.events[0].metadata.repo = { key: "github.com/acme/a", label: "C:\\Users\\jane\\a", source: "remote" }; }],
  ["repos[].name as a path", validateAttributeBody, fates, (b) => { b.repos[0].name = "/Users/jane/work/a"; }],
  ["attribution repoName as a path", validateAttributeBody, attribution, (b) => { b.attributions[0].repoName = "work/repo"; }],
  ["repos[].name empty", validateAttributeBody, fates, (b) => { b.repos[0].name = ""; }],
  // The install id is a random uuid, never a hostname.
  ["origin.machineId as a hostname", validateIngestBody, ingest, (b) => { b.events[0].metadata.origin.machineId = "janes-mbp"; }],
  ["origin.machineId uppercase", validateIngestBody, ingest, (b) => { b.events[0].metadata.origin.machineId = "FC2AEE07-3B90-46CE-97DE-0517F3931F4F"; }],
  ["facts.machineId as a hostname", validateAttributeBody, fates, (b) => { b.facts.machineId = "janes-mbp.local"; }],
  ["pair installId as a hostname", validatePairBody, () => clone(load("pair")[1]), (b) => { b.installId = "janes-mbp"; }],
  // Hashes, never content.
  ["commitSha carrying a commit message", validateAttributeBody, fates, (b) => { b.fates[0].commitSha = "fix: leak customer data"; }],
  ["commitSha abbreviated", validateAttributeBody, attribution, (b) => { b.attributions[0].commitSha = "1111111"; }],
  ["patchId carrying diff text", validateAttributeBody, fates, (b) => { b.fates[0].patchId = "+ const secret = 1"; }],
  ["mergedAs not a sha", validateAttributeBody, fates, (b) => { b.fates[0].mergedAs = "main"; }],
  ["repo root not a sha", validateIngestBody, ingest, (b) => { b.events[0].metadata.repo = { key: "github.com/acme/a", label: "a", source: "remote", root: "/Users/jane/a" }; }],
  // A redacted repo stays redacted.
  ["root next to a hidden key", validateIngestBody, ingest, (b) => { b.events[0].metadata.repo.root = "30c370eadecd60b0b3d048deab1b92cc534c0202"; }],
  ["root next to a dir: key", validateIngestBody, ingest, (b) => { b.events[0].metadata.repo = { key: "dir:fedcba9876543210", label: "", source: "folder", root: "30c370eadecd60b0b3d048deab1b92cc534c0202" }; }],
  ["source that does not fit the key", validateIngestBody, ingest, (b) => { b.events[0].metadata.repo = { key: "dir:fedcba9876543210", label: "", source: "remote" }; }],
  ["placement without a repo", validateIngestBody, ingest, (b) => { delete b.events[0].metadata.repo; }],
  ["placement outside the enum", validateIngestBody, ingest, (b) => { b.events[0].metadata.placement = "touched:/Users/jane/a.ts"; }],
  // Bounded labels, never a custom endpoint.
  ["billingProvider as a custom endpoint", validateIngestBody, ingestPi, (b) => { b.events[0].billingProvider = "https://llm.internal.acme.com/v1?key=PRIVATE"; }],
  ["serviceClass outside the enum", validateIngestBody, ingestPi, (b) => { b.events[0].serviceClass = "acme-enterprise"; }],
  ["speed carrying a URL", validateIngestBody, ingest, (b) => { b.events[0].speed = "https://example.com"; }],
  ["billing route on a surface without one", validateIngestBody, ingest, (b) => { b.events[0].billingProvider = "anthropic"; }],
  ["pi event without its billing route", validateIngestBody, ingestPi, (b) => { delete b.events[0].billingProvider; }],
  // Shapes.
  ["occurredAt with a local offset", validateIngestBody, ingest, (b) => { b.events[0].occurredAt = "2026-06-01T12:00:00+02:00"; }],
  ["a negative token count", validateIngestBody, ingest, (b) => { b.events[0].inputTokens = -1; }],
  ["a fractional token count", validateIngestBody, ingest, (b) => { b.events[0].outputTokens = 1.5; }],
  ["an unknown surface", validateIngestBody, ingest, (b) => { b.source.surface = "cursor"; }],
  ["a legacy provider descriptor", validateIngestBody, ingest, (b) => { b.source = { provider: "anthropic", kind: "local_logs" }; }],
  ["more than 500 events", validateIngestBody, ingest, (b) => { b.events = Array.from({ length: 501 }, () => b.events[3]); }],
  ["metadata without origin", validateIngestBody, ingest, (b) => { delete b.events[3].metadata.origin; }],
  ["half the commit facts", validateAttributeBody, fates, (b) => { delete b.fates[0].linesAdded; }],
  ["an unknown fate", validateAttributeBody, fates, (b) => { b.fates[0].fate = "reverted"; }],
  ["more than 2000 fates", validateAttributeBody, fates, (b) => { b.fates = Array.from({ length: 2001 }, () => b.fates[0]); }],
  ["an import provider the CLI never sends", validateImportBody, () => clone(load("import")[0]), (b) => { b.provider = "chatgpt"; }],
  ["an import day with a time", validateImportBody, () => clone(load("import")[0]), (b) => { b.rows[0].day = "2026-06-01T00:00:00Z"; }],
];

describe("allowed keys cannot carry forbidden values", () => {
  for (const [what, validate, build, mutate] of VALUES) {
    it(`rejects ${what}`, () => {
      const body = build();
      assert.deepEqual(validate(body), { valid: true }, "the base body is valid");
      mutate(body);
      assert.equal(validate(body).valid, false);
    });
  }
});
