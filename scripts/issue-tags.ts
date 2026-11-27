/**
 * タグ ID をロット単位で発行して DB に登録し、NFC 書き込み・QR 印刷用の CSV を出す。
 *
 * 使い方:
 *   node scripts/issue-tags.ts --lot "〇〇小 2026春" --count 100 --base-url https://example.com
 *   （npm run tags:issue -- --lot ... でも可）
 *
 * 必要な環境変数（運営の端末でだけ設定する。コミットしない）:
 *   SUPABASE_URL         Supabase の API URL（なければ NEXT_PUBLIC_SUPABASE_URL）
 *   SUPABASE_SECRET_KEY  Supabase の secret key（service_role）。タグの登録に使う
 */
import { closeSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { generateTagId } from "../src/lib/tags/id.ts";
import { buildCsv, parseIssueArgs } from "../src/lib/tags/issue.ts";

const BATCH_SIZE = 500;
const MAX_ROUNDS = 5;

async function main() {
  const options = parseIssueArgs(process.argv.slice(2));

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "SUPABASE_URL（または NEXT_PUBLIC_SUPABASE_URL）と SUPABASE_SECRET_KEY を設定してください",
    );
  }

  // DB に登録してから書き出しに失敗しないよう、先に出力ファイルを作っておく（上書きはしない）
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = options.out ?? join("issued", `tags-${stamp}.csv`);
  mkdirSync(dirname(out), { recursive: true });
  const fd = openSync(out, "wx");

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const issued: string[] = [];
  // ID が既存のものと重なったら、その分だけ作り直す（実際にはほぼ起きない）
  for (let round = 0; round < MAX_ROUNDS && issued.length < options.count; round++) {
    const wanted = options.count - issued.length;
    const candidates = new Set<string>();
    while (candidates.size < wanted) candidates.add(generateTagId());

    const ids = [...candidates];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const rows = ids
        .slice(i, i + BATCH_SIZE)
        .map((id) => ({ id, lot: options.lot }));
      const { data, error } = await supabase
        .from("tags")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(`タグの登録に失敗しました: ${error.message}`);
      issued.push(...data.map((row) => row.id));
    }
  }

  if (issued.length !== options.count) {
    throw new Error(
      `${options.count} 件のうち ${issued.length} 件しか登録できませんでした`,
    );
  }

  const csv = buildCsv(
    issued.map((id) => ({ id, lot: options.lot })),
    options.baseUrl,
  );
  writeSync(fd, csv);
  closeSync(fd);

  console.log(`${issued.length} 件のタグを発行しました（ロット: ${options.lot}）`);
  console.log(`CSV: ${out}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
