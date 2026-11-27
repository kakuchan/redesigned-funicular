/**
 * タグ ID 発行スクリプト（scripts/issue-tags.ts）の、DB に触れない部分。
 * 出力する CSV には個人情報を含めない（ID・URL・ロットだけ）。
 */
export const MAX_COUNT_PER_RUN = 10_000;

export type IssueOptions = {
  lot: string;
  count: number;
  baseUrl: string;
  out?: string;
};

export function parseIssueArgs(argv: readonly string[]): IssueOptions {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new Error(`不明な引数です: ${arg}`);
    const [key, inline] = arg.slice(2).split("=", 2);
    const value = inline ?? argv[++i];
    if (value === undefined) throw new Error(`--${key} に値がありません`);
    values.set(key, value);
  }

  for (const key of values.keys()) {
    if (!["lot", "count", "base-url", "out"].includes(key)) {
      throw new Error(`不明なオプションです: --${key}`);
    }
  }

  const lot = values.get("lot")?.trim() ?? "";
  if (lot.length < 1 || lot.length > 100) {
    throw new Error("--lot は 1〜100 文字で指定してください");
  }

  const countText = values.get("count") ?? "";
  const count = Number(countText);
  if (!/^\d+$/.test(countText) || count < 1 || count > MAX_COUNT_PER_RUN) {
    throw new Error(`--count は 1〜${MAX_COUNT_PER_RUN} の整数で指定してください`);
  }

  const baseUrl = normalizeBaseUrl(values.get("base-url") ?? "");

  return { lot, count, baseUrl, out: values.get("out") };
}

export function normalizeBaseUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("--base-url は https://example.com の形で指定してください");
  }
  const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new Error("--base-url は https にしてください（ローカルだけ http 可）");
  }
  if (url.search || url.hash || url.username || url.password) {
    throw new Error("--base-url にクエリや認証情報は入れられません");
  }
  return url.origin + url.pathname.replace(/\/+$/, "");
}

export function tagUrl(baseUrl: string, id: string): string {
  return `${baseUrl}/t/${id}`;
}

function csvField(value: string): string {
  // 表計算ソフトで式として解釈されないようにする
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function buildCsv(
  rows: readonly { id: string; lot: string }[],
  baseUrl: string,
): string {
  const lines = ["id,url,lot"];
  for (const row of rows) {
    lines.push(
      [row.id, tagUrl(baseUrl, row.id), row.lot].map(csvField).join(","),
    );
  }
  return lines.join("\n") + "\n";
}
