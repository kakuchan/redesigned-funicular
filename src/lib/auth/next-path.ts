/**
 * ログイン後に戻る先。外部サイトへ飛ばされないよう、サイト内のパスだけを許す。
 */
export function safeNextPath(value: unknown, fallback = "/items"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (/[\r\n\t]/.test(value)) return fallback;
  return value;
}
