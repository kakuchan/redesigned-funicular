import { describe, expect, it } from "vitest";
import { readPublicEnv } from "./env";

describe("readPublicEnv", () => {
  it("必要な値がそろっていれば返す", () => {
    expect(
      readPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
      }),
    ).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "test-key",
    });
  });

  it("足りない変数名を全部挙げて失敗する", () => {
    expect(() => readPublicEnv({})).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("URL の形式でなければ失敗する", () => {
    expect(() =>
      readPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "not a url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
      }),
    ).toThrow("URL の形式ではありません");
  });

  it("エラー文に値そのものを含めない", () => {
    try {
      readPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "secret-looking-value",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k",
      });
    } catch (e) {
      expect(String(e)).not.toContain("secret-looking-value");
    }
  });
});
