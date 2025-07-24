import { expect, test } from "vitest";
import * as z from "zod/v4";

test("issue #3197: z.record should preserve undefined values like z.object", () => {
  // Test z.object behavior - this should preserve undefined values
  const objectResult = z.object({ foo: z.any() }).parse({ foo: undefined });

  // Test z.record behavior - this should also preserve undefined values
  const recordResult = z.record(z.string(), z.any()).parse({ foo: undefined });

  // Both should have the same keys
  expect(Object.keys(objectResult)).toEqual(["foo"]);
  expect(Object.keys(recordResult)).toEqual(["foo"]);

  // Both should preserve the undefined value
  expect(objectResult.foo).toBeUndefined();
  expect(recordResult.foo).toBeUndefined();

  // Both results should be equivalent
  expect(recordResult).toEqual(objectResult);
});
