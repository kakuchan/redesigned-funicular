import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("サイト内のパスはそのまま", () => {
    expect(safeNextPath("/register/AbCd2345EfGh6789")).toBe("/register/AbCd2345EfGh6789");
    expect(safeNextPath("/items?x=1")).toBe("/items?x=1");
  });

  it.each([
    undefined,
    null,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/items\n",
  ])("外部や不正な値は既定の戻り先にする（%s）", (value) => {
    expect(safeNextPath(value)).toBe("/items");
  });
});
