import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { schema } from "../src/index.js";

// Headers are transport: authorization and content-type ride beside the two
// contract headers, so that one object stays open.
const OPEN = new Set(["RequestHeaders"]);

function* objectSchemas(node, path) {
  if (Array.isArray(node)) {
    for (const [i, n] of node.entries()) yield* objectSchemas(n, `${path}/${i}`);
    return;
  }
  if (node === null || typeof node !== "object") return;
  if (node.type === "object") yield [path, node];
  for (const [k, v] of Object.entries(node)) yield* objectSchemas(v, `${path}/${k}`);
}

describe("the schema", () => {
  it("is draft 2020-12", () => {
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  });
  it("is closed: every object type forbids additional properties", () => {
    for (const [path, node] of objectSchemas(schema.$defs, "#/$defs")) {
      if (OPEN.has(path.split("/")[2])) continue;
      assert.equal(node.additionalProperties, false, `${path} must set additionalProperties: false`);
    }
  });
  it("declares every request body the CLI sends", () => {
    for (const def of ["IngestBody", "AttributeBody", "PairBody", "PairPollBody", "ImportBody", "RequestHeaders"]) {
      assert.ok(schema.$defs[def], def);
    }
  });
});
