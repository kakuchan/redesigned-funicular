import { describe, expect, it } from "vitest";
import { clientIp, hashIp, ipHashFromHeaders } from "./ip";

describe("clientIp", () => {
  it("x-forwarded-for の先頭を使う", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.6" }))).toBe("203.0.113.6");
    expect(clientIp(new Headers())).toBeNull();
  });
});

describe("hashIp", () => {
  it("塩が違えば別の値、同じなら同じ値。生の IP は含まない", () => {
    const a = hashIp("203.0.113.5", "salt-a");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(hashIp("203.0.113.5", "salt-a"));
    expect(a).not.toBe(hashIp("203.0.113.5", "salt-b"));
    expect(a).not.toContain("203");
  });

  it("塩がなければハッシュを作らない", () => {
    expect(ipHashFromHeaders(new Headers({ "x-real-ip": "1.2.3.4" }), {})).toBeNull();
    expect(ipHashFromHeaders(new Headers({ "x-real-ip": "1.2.3.4" }), { RATE_LIMIT_SALT: "s" })).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });
});
