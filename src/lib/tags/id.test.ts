import { describe, expect, it } from "vitest";
import {
  TAG_ID_ALPHABET,
  TAG_ID_LENGTH,
  generateTagId,
  isTagId,
} from "./id";

// DB の制約（supabase/migrations/..._tags_items.sql）と同じ
const DB_CHECK = /^[0-9A-Za-z]{12,32}$/;

describe("generateTagId", () => {
  it("決めた長さで、決めた文字だけを使う", () => {
    for (let i = 0; i < 1000; i++) {
      const id = generateTagId();
      expect(id).toHaveLength(TAG_ID_LENGTH);
      expect(isTagId(id)).toBe(true);
      expect(DB_CHECK.test(id)).toBe(true);
    }
  });

  it("見間違えやすい文字を含まない", () => {
    for (const ch of ["0", "O", "1", "l", "I"]) {
      expect(TAG_ID_ALPHABET).not.toContain(ch);
    }
  });

  it("10 万件作っても重ならない", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100_000; i++) ids.add(generateTagId());
    expect(ids.size).toBe(100_000);
  });

  it("偏りを生む乱数値は捨てる（256 の端数）", () => {
    // 最初は捨てられるべき 255 だけ、その後は 0 を返す乱数
    let calls = 0;
    const id = generateTagId((bytes) => {
      bytes.fill(calls++ === 0 ? 255 : 0);
      return bytes;
    });
    expect(id).toBe(TAG_ID_ALPHABET[0].repeat(TAG_ID_LENGTH));
    expect(calls).toBe(2);
  });

  it("文字の出方に大きな偏りがない", () => {
    const counts = new Map<string, number>();
    const n = 20_000;
    for (let i = 0; i < n; i++) {
      for (const ch of generateTagId()) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    const expected = (n * TAG_ID_LENGTH) / TAG_ID_ALPHABET.length;
    expect(counts.size).toBe(TAG_ID_ALPHABET.length);
    for (const count of counts.values()) {
      expect(Math.abs(count - expected) / expected).toBeLessThan(0.05);
    }
  });
});

describe("isTagId", () => {
  it("形式が違うものは弾く", () => {
    expect(isTagId("")).toBe(false);
    expect(isTagId("abc")).toBe(false);
    expect(isTagId("O".repeat(TAG_ID_LENGTH))).toBe(false);
    expect(isTagId("a".repeat(TAG_ID_LENGTH) + "a")).toBe(false);
    expect(isTagId("aaaaaaaa/aaaaaaa")).toBe(false);
  });
});
