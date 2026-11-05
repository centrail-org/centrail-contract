// Hand-written to match schema/wire.schema.json; test/types.check.ts pins them.
// Fields marked "capability" are sent only to a server that lists it, and
// only once the install has answered the scope question.

export type Surface = "claude-code" | "copilot-cli" | "codex" | "pi" | "gemini-cli";
export type Capability = "repo" | "match" | "usage-extras" | "patch-id" | "billing-route";
export type BillingProvider =
  | "anthropic" | "openai" | "google" | "openrouter" | "amazon-bedrock"
  | "google-vertex" | "azure" | "openai-codex" | "github-copilot" | "unknown";
export type ServiceClass = "standard" | "priority" | "flex" | "batch" | "unknown";
export type Placement = "cwd" | "files" | "sticky" | "folder";
export type RepoSource = "remote" | "root" | "folder";
export type Fate = "shipped" | "in_flight" | "unshipped";

/** host/owner/repo, sha:<root>, dir:<hmac16> or hidden:<hmac16>. */
export type RepoKey = string;
/** UTC ISO-8601 instant ending in Z. */
export type IsoInstant = string;
/** 40 or 64 lowercase hex. */
export type ObjectId = string;
/** Lowercase uuid from crypto.randomUUID. */
export type InstallId = string;

export type RepoIdentity = {
  key: RepoKey;
  label: string;
  source: RepoSource;
  root?: ObjectId;
};

export type EventMetadata = {
  repo?: RepoIdentity;
  placement?: Placement;
  sessionId?: string;
  gitBranch?: string;
  origin: { machineId: InstallId };
};

export type IngestEvent = {
  externalId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cacheWriteTokens?: number;
  cacheCreation5mTokens: number;
  cacheCreation1hTokens: number;
  occurredAt: IsoInstant;
  /** capability "usage-extras" */
  speed?: string;
  /** capability "usage-extras" */
  webSearchRequests?: number;
  /** capability "repo" */
  metadata?: EventMetadata;
  /** capability "billing-route"; required on pi and gemini-cli, absent elsewhere */
  billingProvider?: BillingProvider;
  /** capability "billing-route" */
  serviceClass?: ServiceClass;
};

export type IngestBody = {
  source: { surface: Surface; kind: "local_logs" };
  events: IngestEvent[];
};

export type Repo = {
  name: string;
  /** capability "repo" */
  key?: RepoKey;
  totalLoc: number | null;
  fileCount: number;
};

export type Attribution = {
  externalId: string;
  repoName: string;
  /** capability "repo" */
  repoKey?: RepoKey;
  commitSha: ObjectId;
  committedAt: IsoInstant;
  branch: string | null;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
};

export type FateRow = {
  repoName: string;
  /** capability "repo" */
  repoKey?: RepoKey;
  commitSha: ObjectId;
  branch: string | null;
  fate: Fate;
  /** capability "repo" */
  mergedAs?: ObjectId;
  /** capability "repo"; "" with zero counts when the commit's facts are unknown */
  committedAt?: IsoInstant | "";
  /** capability "repo" */
  linesAdded?: number;
  /** capability "repo" */
  linesDeleted?: number;
  /** capability "repo" */
  filesChanged?: number;
  /** capability "repo" */
  mine?: boolean;
  /** capability "patch-id" */
  patchId?: ObjectId;
  /** capability "patch-id" */
  branchPatchId?: ObjectId;
};

export type FatesFacts = { machineId: InstallId; complete: boolean };

export type AttributeBody = {
  repos: Repo[];
  attributions: Attribution[];
  fates?: FateRow[];
  /** capability "repo" */
  facts?: FatesFacts;
};

export type PairBody = { hostname: "Centrail CLI"; installId?: InstallId };
export type PairPollBody = { pollToken: string };

export type ImportRow = {
  day: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  contextTokens: number;
};
export type ImportBody = { provider: "ccusage"; rows: ImportRow[] };

export type RequestHeaders = {
  "centrail-cli-version": string;
  "centrail-wire": "1";
  [header: string]: string;
};

export type ValidationResult = { valid: true } | { valid: false; errors: string[] };
export type ValidateOptions = {
  /** Capabilities granted: the server's list after consent ([] while the scope question is unanswered). Omit to skip capability checks. */
  fields?: readonly string[];
};

export declare const schema: {
  $schema: string;
  $id: string;
  $defs: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
};
export declare const CAPABILITIES: readonly Capability[];
export declare const CAPABILITY_FIELDS: Readonly<Record<string, Readonly<Record<string, Capability>>>>;

export declare function validateIngestBody(body: unknown, opts?: ValidateOptions): ValidationResult;
export declare function validateAttributeBody(body: unknown, opts?: ValidateOptions): ValidationResult;
export declare function validatePairBody(body: unknown): ValidationResult;
export declare function validatePairPollBody(body: unknown): ValidationResult;
export declare function validateImportBody(body: unknown): ValidationResult;
export declare function validateRequestHeaders(headers: unknown): ValidationResult;
