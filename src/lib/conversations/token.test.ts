import { describe, expect, it } from "vitest";
import { hashFinderToken, isFinderToken, newFinderToken } from "./token";

describe("finder token", () => {
  it("43 文字の base64url と、64 桁のハッシュ", () => {
    const { token, hash } = newFinderToken();
    expect(isFinderToken(token)).toBe(true);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashFinderToken(token));
    expect(hash).not.toContain(token);
  });

  it("毎回違う", () => {
    const set = new Set(Array.from({ length: 1000 }, () => newFinderToken().token));
    expect(set.size).toBe(1000);
  });

  it("形の違う値は弾く", () => {
    for (const v of ["", "short", "a".repeat(44), "a".repeat(42) + "/", "../" + "a".repeat(40)]) {
      expect(isFinderToken(v)).toBe(false);
    }
  });
});
