import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURES, load } from "./helpers.js";

describe("valid fixtures", () => {
  for (const [name, validate, fields] of FIXTURES) {
    load(name).forEach((body, i) => {
      it(`${name}[${i}] validates`, () => {
        assert.deepEqual(validate(body), { valid: true });
        if (fields) assert.deepEqual(validate(body, { fields }), { valid: true }, "at its capability set");
      });
    });
  }
});
