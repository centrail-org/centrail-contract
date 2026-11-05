# centrail-contract

This package is the wire contract of the [Centrail](https://centrail.org) CLI.
It is the **complete list of what the CLI may send** to a Centrail server: a
JSON Schema (draft 2020-12) for every request body, TypeScript types that match
it, and tests that prove forbidden content is rejected.

The schema is closed (`additionalProperties: false` throughout). A key it does
not name is not part of the contract. Prompts, completions, code, diffs, commit
messages, file paths, working directories, tool inputs and outputs, URLs,
hostnames and account data have no place in it, and `test/allowlist.test.js`
proves each one is rejected.

| Body | Route | `$defs` |
|---|---|---|
| Usage batch | `POST /api/cli/ingest` | `IngestBody` |
| Commit attribution and fates | `POST /api/cli/attribute` | `AttributeBody` |
| Pairing | `POST /api/cli/pair`, `/api/cli/pair/poll` | `PairBody`, `PairPollBody` |
| ccusage import | `POST /api/import` | `ImportBody` |
| Contract headers | every request | `RequestHeaders` |

`GET /api/cli/device` and `GET /api/cli/capabilities` send no body.

## Consent-gated fields

A field annotated `x-capability` is sent only when two things hold: the server
lists that capability in `GET /api/cli/capabilities`, and the user has answered
the CLI's scope question. Until both hold, every body is the 0.5.1 shape.

| Capability | Unlocks |
|---|---|
| `repo` | event `metadata` (repo identity, placement, session, branch, install id), repo keys, commit facts on fates, `facts` |
| `usage-extras` | event `speed`, `webSearchRequests` |
| `patch-id` | fate `patchId`, `branchPatchId` (hashes, never the diff) |
| `billing-route` | `billingProvider`, `serviceClass` (pi and gemini-cli only) |
| `match` | the server attributes events itself, so the CLI sends no `attributions` |

## Use

```js
import { validateIngestBody, schema } from "centrail-contract";

validateIngestBody(body);                                // shape only
validateIngestBody(body, { fields: ["repo", "match"] }); // and only granted fields
// → { valid: true } | { valid: false, errors: [...] }
```

The raw schema is also exported as `centrail-contract/schema.json`.

## Verify

```sh
npm install
npm test          # fixtures validate; forbidden content is rejected
npm run typecheck # the types match the schema
```

`DISCREPANCIES.md` lists where the CLI's sender and the server's validator
currently disagree, with file:line references.

## Versioning

The package follows semver. Adding a field is a minor version. Removing a
field, or tightening one, is a major version. A tightening is any change that
rejects a body the previous version accepted. The `centrail-wire` header (`1`)
is separate: it changes only when the payload breaks for servers.

## License

Apache-2.0.
