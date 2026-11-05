# Discrepancies

Where the CLI's sender, the server's validator and `CONTRACT.md` disagree, as
of centrail-cli `4d922ba` and centrail `b1ed718a` (both `origin/main`). Paths:
CLI = `centrail-cli/packages/cli/src/`, server = `centrail/src/`. The schema's
choice is stated for each one. Close an entry by fixing the side that is wrong
and deleting it here.

## Posture

1. **Closed schema, open server.** The server drops keys it does not name
   (server `lib/cli/wire.ts:7-16`, `toStoredMetadata` `:195-208`); this schema
   rejects them. Intended: the schema states what the CLI may send, the server
   still guards untrusted input on its own.
2. **Malformed optional values: the server drops them, the schema rejects.**
   `speed`, `webSearchRequests` (server `lib/cli/wire.ts:305-311`), `placement`
   (`:155-157`), `repo.root` (`:172`), `origin.machineId` (`:325`), and on fates
   `mine`, `mergedAs`, `patchId`, `branchPatchId` (server
   `lib/cli/attribute-wire.ts:232-235`), the four commit facts (`:253-261`) and
   `facts` (`:164-169`). Malformed attribution and fate rows are skipped and
   counted rather than failing the batch (`:132-158`). The schema rejects all of
   these, so a CLI test against it fails where the server silently loses data.

## CLI and server disagree

3. **Fate `committedAt: ""`.** The CLI sends `committedAt: ""` with zero
   counts when it does not know a commit's facts (CLI `wire.ts:270-273`). The
   server reads `""` as "no facts" and drops all four (server
   `lib/cli/attribute-wire.ts:256`). `CONTRACT.md:147` says ISO. Schema: ISO or
   `""`. Better fix: the CLI omits all four facts, as the server's all-or-none
   rule already expects.
4. **String bounds: the server truncates, the CLI does not bound.**
   `metadata.sessionId`, `metadata.gitBranch` and `repo.label` are cut to 255
   characters (server `lib/cli/wire.ts:171`, `:323-324`, `:359-361`). The CLI
   sends them at whatever length the log holds (CLI `wire.ts:165-175`). Schema:
   `maxLength: 255`, which rejects a longer value the server would accept
   truncated.
5. **`webSearchRequests` lower bound.** The CLI sends it only when it is
   non-zero (CLI `wire.ts:151`), and `CONTRACT.md:234` says positive. The server
   accepts 0 to 10000 (server `lib/cli/wire.ts:303`, `:309`). Schema: 1 to 10000.
6. **`speed` shape.** The CLI sends any non-empty string (CLI `wire.ts:150`).
   The server keeps only `^[a-z_-]{1,32}$` (server `lib/cli/wire.ts:302`,
   `:307`). Schema: the server's pattern.
7. **Count ceilings exist only on the server.** Tokens are capped at ≤ 1e9 on
   ingest (server `lib/cli/wire.ts:22`), commit counts and `totalLoc` at ≤ 1e8
   on attribute (`lib/cli/attribute-wire.ts:11`), and import tokens at ≤ 1e12
   (`lib/import/validate.ts:9`). The CLI has no ceiling. Schema: the server's
   ceilings.
8. **`metadata.origin` is always present in the CLI's metadata.** The CLI
   always sends it (CLI `wire.ts:166`); the server treats it as optional (server
   `lib/cli/wire.ts:90`, `:325`). Schema: required inside `metadata`.
9. **Patch id length.** `CONTRACT.md:207` says 40 hex. The server accepts 40 or
   64 (server `lib/cli/attribute-wire.ts:241`). Schema: 40 or 64, so SHA-256
   repos are covered.
10. **Billing route.** The server requires `billingProvider` on every `pi` and
    `gemini-cli` event, whatever the capabilities (server
    `lib/cli/wire.ts:259-260`). The CLI sends it only when the server lists
    `billing-route` (CLI `wire.ts:154`). The two agree in practice only because
    sync skips those scanners without it (`CONTRACT.md` § Additional local
    surfaces). On other surfaces the server ignores the route; the CLI never
    sends it. Schema: required on pi and gemini-cli, forbidden elsewhere.

## The server accepts what the CLI never sends

11. **Legacy surface descriptor** `source: { provider: "anthropic" }` (server
    `lib/cli/wire.ts:30-31`, `:251-253`), from centrail@0.1.0. The CLI sends
    `source.surface` (CLI `commands/sync.ts:257`). Schema: `surface` only.
12. **Event `provider`** is accepted and ignored (server `lib/cli/wire.ts:62`,
    `:287`). The CLI never sends it (CLI `wire.ts:24-39`). Schema: forbidden.
13. **Import providers** `chatgpt`, `claude`, `gemini` (server
    `lib/import/types.ts:11`) are the browser's. The CLI sends `ccusage` only
    (CLI `commands/import.ts:77`). Schema: `ccusage` only.
14. **Pair `hostname`.** The server ignores the body's value and stores a
    fixed label (server `app/api/cli/pair/route.ts:13`, `:45`). The CLI sends
    the constant `Centrail CLI` (CLI `commands/connect.ts:12`, `:53`). Schema:
    `const: "Centrail CLI"`, which proves the machine's name is never sent.

## The schema is stricter than both validators (it can be, because of what the CLI sends)

15. **`commitSha`.** The server accepts any string of 1 to 64 characters
    (server `lib/cli/attribute-wire.ts:192`, `:218`). The CLI sends full git
    object ids. Schema: 40 or 64 lowercase hex, so no text can ride in the slot.
16. **`repo.label` and `repoName` hold no path separator.** The server accepts
    any string of 255 characters or fewer. The CLI sends a basename, or the
    `hidden:` key (CLI `wire.ts:198-201`). Schema: `^[^/\\]*$`.

## Not expressible in JSON Schema (the server checks these at runtime)

17. `occurredAt` must be on or after 2020-01-01 and no more than 24 h ahead
    (server `lib/cli/wire.ts:23`, `:268-269`).
18. A `sha:` key's `root` must equal the key's sha (server
    `lib/cli/wire.ts:180`).
19. `mergedAs` must differ from the row's own `commitSha` (server
    `lib/cli/attribute-wire.ts:247-249`).
20. Repo keys must not change under `toLowerCase()`. The schema rejects only
    `\p{Lu}`, which misses rare titlecase letters (server `lib/cli/wire.ts:129`).
