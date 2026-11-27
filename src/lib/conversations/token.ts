import { createHash, randomBytes } from "node:crypto";

/**
 * 拾った人の一時リンクに入れるトークン。
 * 32 バイトの乱数（base64url で 43 文字）。DB には SHA-256 だけを保存する。
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function newFinderToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashFinderToken(token) };
}

export function hashFinderToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isFinderToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}
