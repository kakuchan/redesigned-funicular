import { describe, expect, it } from "vitest";
import { buildCsv, normalizeBaseUrl, parseIssueArgs, tagUrl } from "./tag-issue";

const base = ["--lot", "〇〇小 2026春", "--count", "100", "--base-url", "https://example.com"];

describe("parseIssueArgs", () => {
  it("正しい引数を読む", () => {
    expect(parseIssueArgs(base)).toEqual({
      lot: "〇〇小 2026春",
      count: 100,
      baseUrl: "https://example.com",
      out: undefined,
    });
  });

  it("--key=value の形も読める", () => {
    expect(parseIssueArgs(["--lot=A", "--count=1", "--base-url=https://x.test"]).lot).toBe("A");
  });

  it.each([
    [["--count", "1", "--base-url", "https://x.test"], "--lot"],
    [["--lot", "A", "--count", "0", "--base-url", "https://x.test"], "--count"],
    [["--lot", "A", "--count", "1.5", "--base-url", "https://x.test"], "--count"],
    [["--lot", "A", "--count", "10001", "--base-url", "https://x.test"], "--count"],
    [["--lot", "A", "--count", "1"], "--base-url"],
    [[...base, "--owner", "x"], "不明なオプション"],
    [[...base, "extra"], "不明な引数"],
  ])("おかしな引数は失敗する %#", (args, message) => {
    expect(() => parseIssueArgs(args)).toThrow(message);
  });
});

describe("normalizeBaseUrl", () => {
  it("末尾のスラッシュを取る", () => {
    expect(normalizeBaseUrl("https://example.com/")).toBe("https://example.com");
    expect(normalizeBaseUrl("https://example.com/app//")).toBe("https://example.com/app");
  });

  it("http はローカルだけ許す", () => {
    expect(normalizeBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
    expect(() => normalizeBaseUrl("http://example.com")).toThrow("https");
  });

  it("クエリや認証情報は入れられない", () => {
    expect(() => normalizeBaseUrl("https://example.com?x=1")).toThrow();
    expect(() => normalizeBaseUrl("https://u:p@example.com")).toThrow();
  });
});

describe("buildCsv", () => {
  it("ID・URL・ロットだけを出す", () => {
    const csv = buildCsv([{ id: "AbCd2345EfGh6789", lot: "イベントA" }], "https://example.com");
    expect(csv).toBe(
      "id,url,lot\nAbCd2345EfGh6789,https://example.com/t/AbCd2345EfGh6789,イベントA\n",
    );
    expect(tagUrl("https://example.com", "x")).toBe("https://example.com/t/x");
  });

  it("ロット名のカンマ・引用符・式をエスケープする", () => {
    const csv = buildCsv(
      [
        { id: "a", lot: 'A,"B"' },
        { id: "b", lot: "=HYPERLINK(1)" },
      ],
      "https://x.test",
    );
    const lines = csv.trim().split("\n");
    expect(lines[1]).toBe('a,https://x.test/t/a,"A,""B"""');
    expect(lines[2]).toBe("b,https://x.test/t/b,'=HYPERLINK(1)");
  });
});
