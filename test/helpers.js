import { readFileSync } from "node:fs";
import * as contract from "../src/index.js";

export const load = (name) =>
  [].concat(JSON.parse(readFileSync(new URL(`./fixtures/valid/${name}.json`, import.meta.url), "utf8")));

// Every valid fixture, the validator it belongs to, and the capabilities the
// server granted when it was sent ([] = scope unanswered or a 0.5.1-era server).
export const FIXTURES = [
  ["ingest-0.5.1", contract.validateIngestBody, []],
  ["ingest-0.6", contract.validateIngestBody, ["repo", "match", "patch-id"]],
  ["ingest-consented", contract.validateIngestBody, ["repo", "usage-extras"]],
  ["ingest-billing-route", contract.validateIngestBody, ["repo", "billing-route"]],
  ["attribute-0.5.1", contract.validateAttributeBody, []],
  ["attribute-0.6", contract.validateAttributeBody, ["repo", "match", "patch-id"]],
  ["attribute-consented", contract.validateAttributeBody, ["repo"]],
  ["pair", contract.validatePairBody, undefined],
  ["pair-poll", contract.validatePairPollBody, undefined],
  ["import", contract.validateImportBody, undefined],
  ["headers", contract.validateRequestHeaders, undefined],
];

export const clone = (v) => structuredClone(v);
