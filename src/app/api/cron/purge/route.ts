import { timingSafeEqual } from "node:crypto";
import { PHOTO_BUCKET } from "@/lib/photos/store";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 記録の自動削除（毎日1回。vercel.json の crons から呼ぶ）。
 * - 終わってから90日たった会話とメッセージ・写真
 * - 1日たった回数制限の記録、7日たった IP ハッシュ、期限切れのブロック
 * Authorization: Bearer <CRON_SECRET> が必要。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    given.length !== expected.length ||
    !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("purge_expired_data");
  if (error) return Response.json({ ok: false }, { status: 500 });

  const paths = (data ?? []).map((row) => row.photo_path).filter((p): p is string => !!p);
  for (let i = 0; i < paths.length; i += 100) {
    await admin.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 100));
  }
  return Response.json({ ok: true, photos: paths.length });
}
