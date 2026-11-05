import Ajv2020 from "ajv/dist/2020.js";
import schema from "../schema/wire.schema.json" with { type: "json" };

export { schema };

const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false, strictRequired: false });
// Annotation only: which capability a field needs. Validation ignores it;
// capability checks below read it straight from the schema.
ajv.addKeyword({ keyword: "x-capability", schemaType: "string" });
ajv.addSchema(schema);

const compiled = (name) => {
  const fn = ajv.getSchema(`${schema.$id}#/$defs/${name}`);
  if (!fn) throw new Error(`schema has no $defs/${name}`);
  return fn;
};

/** Every capability a field can be gated on, in the order the server lists them. */
export const CAPABILITIES = Object.freeze(["repo", "match", "usage-extras", "patch-id", "billing-route"]);

// { DefName: { property: capability } }, read from the schema's x-capability
// annotations so the gate list cannot drift from the schema.
export const CAPABILITY_FIELDS = Object.freeze(
  Object.fromEntries(
    Object.entries(schema.$defs)
      .map(([def, s]) => [
        def,
        Object.freeze(
          Object.fromEntries(
            Object.entries(s.properties ?? {})
              .filter(([, p]) => typeof p["x-capability"] === "string")
              .map(([prop, p]) => [prop, p["x-capability"]]),
          ),
        ),
      ])
      .filter(([, gates]) => Object.keys(gates).length > 0),
  ),
);

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function gateErrors(value, def, path, granted, out) {
  if (!isObject(value)) return;
  for (const [prop, cap] of Object.entries(CAPABILITY_FIELDS[def] ?? {})) {
    if (Object.hasOwn(value, prop) && !granted.has(cap)) {
      out.push(`${path}/${prop} requires capability "${cap}"`);
    }
  }
}

function eachItem(list, def, path, granted, out) {
  if (Array.isArray(list)) list.forEach((item, i) => gateErrors(item, def, `${path}/${i}`, granted, out));
}

function run(name, gates) {
  const fn = compiled(name);
  return (value, opts = {}) => {
    const errors = [];
    if (!fn(value)) {
      for (const e of fn.errors ?? []) errors.push(`${e.instancePath || "/"} ${e.message}`);
    } else if (gates && opts.fields !== undefined) {
      gates(value, new Set(opts.fields), errors);
    }
    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  };
}

/**
 * Validate a POST /api/cli/ingest body. With `fields` (what the server
 * listed, or [] while the scope question is unanswered), also reject any
 * field whose capability was not granted.
 */
export const validateIngestBody = run("IngestBody", (body, granted, out) => {
  eachItem(body.events, "IngestEvent", "/events", granted, out);
});

/** Validate a POST /api/cli/attribute body; `fields` as for validateIngestBody. */
export const validateAttributeBody = run("AttributeBody", (body, granted, out) => {
  gateErrors(body, "AttributeBody", "", granted, out);
  eachItem(body.repos, "Repo", "/repos", granted, out);
  eachItem(body.attributions, "Attribution", "/attributions", granted, out);
  eachItem(body.fates, "Fate", "/fates", granted, out);
  // A server that matches attributes events itself: the CLI sends none.
  if (granted.has("repo") && granted.has("match") && body.attributions.length > 0) {
    out.push(`/attributions must be empty when the server lists "repo" and "match"`);
  }
});

export const validatePairBody = run("PairBody");
export const validatePairPollBody = run("PairPollBody");
export const validateImportBody = run("ImportBody");
export const validateRequestHeaders = run("RequestHeaders");
