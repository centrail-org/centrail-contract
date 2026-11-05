// Compile-time pins for src/index.d.ts (npm run typecheck). Each literal is a
// valid fixture's shape; each @ts-expect-error is a key the schema forbids.
import {
  validateAttributeBody,
  validateIngestBody,
  type AttributeBody,
  type FateRow,
  type ImportBody,
  type IngestBody,
  type IngestEvent,
  type PairBody,
  type ValidationResult,
} from "centrail-contract";

const event = {
  externalId: "req_1",
  model: "claude-opus-4-8",
  inputTokens: 1,
  outputTokens: 1,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  cacheCreation5mTokens: 0,
  cacheCreation1hTokens: 0,
  occurredAt: "2026-06-01T12:00:00.000Z",
  speed: "fast",
  metadata: {
    origin: { machineId: "fc2aee07-3b90-46ce-97de-0517f3931f4f" },
    repo: { key: "github.com/acme/a", label: "a", source: "remote" },
    placement: "files",
  },
} satisfies IngestEvent;

export const ingest: IngestBody = { source: { surface: "pi", kind: "local_logs" }, events: [{ ...event, billingProvider: "openai-codex" }] };

export const fate: FateRow = {
  repoName: "a", commitSha: "1".repeat(40), branch: null, fate: "shipped",
  committedAt: "", linesAdded: 0, linesDeleted: 0, filesChanged: 0, patchId: "3".repeat(40),
};
export const attribute: AttributeBody = {
  repos: [{ name: "a", key: "github.com/acme/a", totalLoc: null, fileCount: 0 }],
  attributions: [],
  fates: [fate],
  facts: { machineId: "fc2aee07-3b90-46ce-97de-0517f3931f4f", complete: true },
};
export const pair: PairBody = { hostname: "Centrail CLI" };
export const imported: ImportBody = { provider: "ccusage", rows: [] };

// @ts-expect-error prompts are never part of an event
export const withPrompt: IngestEvent = { ...event, prompt: "PRIVATE" };
// @ts-expect-error the working directory never leaves the machine
export const withCwd: IngestEvent = { ...event, metadata: { ...event.metadata, cwd: "/Users/jane" } };
// @ts-expect-error origin carries the install id only
export const withHost: IngestEvent = { ...event, metadata: { ...event.metadata, origin: { machineId: "x", host: "janes-mbp" } } };
// @ts-expect-error a fate row carries no commit message
export const withMessage: FateRow = { ...fate, message: "COMMIT-MESSAGE" };
// @ts-expect-error pairing sends the fixed label, never the machine's name
export const realHostname: PairBody = { hostname: "janes-mbp" };

const r: ValidationResult = validateIngestBody(ingest, { fields: ["repo", "billing-route"] });
if (!r.valid) r.errors satisfies string[];
validateAttributeBody(attribute);
