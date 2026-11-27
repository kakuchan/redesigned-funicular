import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeOtp, validateItemInput } from "./validate";

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

describe("validateItemInput", () => {
  it("前後の空白を取って通す", () => {
    expect(validateItemInput(form({ name: " 青い水筒 ", publicMessage: " よろしく " }))).toEqual({
      ok: true,
      value: { name: "青い水筒", publicMessage: "よろしく" },
    });
  });

  it("名前は必須", () => {
    expect(validateItemInput(form({ name: "  " }))).toMatchObject({ ok: false });
  });

  it("文字数は絵文字も1文字として数える", () => {
    expect(validateItemInput(form({ name: "🎒".repeat(50) })).ok).toBe(true);
    expect(validateItemInput(form({ name: "あ".repeat(51) })).ok).toBe(false);
    expect(validateItemInput(form({ name: "a", publicMessage: "あ".repeat(201) })).ok).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("小文字にして通す", () => {
    expect(normalizeEmail(" Owner@Example.COM ")).toBe("owner@example.com");
  });
  it.each(["", "abc", "a@b", "a @b.c", null])("形式が違えば null（%s）", (v) => {
    expect(normalizeEmail(v)).toBeNull();
  });
});

describe("normalizeOtp", () => {
  it("6桁の数字だけ", () => {
    expect(normalizeOtp("123 456")).toBe("123456");
    expect(normalizeOtp("12345")).toBeNull();
    expect(normalizeOtp("abcdef")).toBeNull();
  });
});
