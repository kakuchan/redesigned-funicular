import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_PHOTO_BYTES, isJpeg, stripJpegMetadata } from "./jpeg";

export const PHOTO_BUCKET = "photos";

/** フォームの写真を確かめる。なければ null、使えなければエラー文。 */
export async function readPhoto(
  value: FormDataEntryValue | null,
): Promise<{ bytes: Uint8Array } | { error: string } | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > MAX_PHOTO_BYTES) return { error: "写真が大きすぎます（3MB まで）" };
  const bytes = new Uint8Array(await value.arrayBuffer());
  if (!isJpeg(bytes)) return { error: "写真の形式が使えません" };
  try {
    return { bytes: stripJpegMetadata(bytes) };
  } catch {
    return { error: "写真を読み込めませんでした" };
  }
}

/** 位置情報を消した写真を保存し、メッセージに付ける。失敗しても連絡そのものは残す。 */
export async function storeFinderPhoto(
  conversationId: string,
  messageId: string,
  bytes: Uint8Array,
): Promise<boolean> {
  const admin = createAdminClient();
  const path = `${conversationId}/${messageId}.jpg`;
  const { error } = await admin.storage
    .from(PHOTO_BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) {
    console.error("写真を保存できませんでした", error.message);
    return false;
  }
  const { error: attachError } = await admin.rpc("finder_attach_photo", {
    p_message_id: messageId,
    p_photo_path: path,
  });
  return !attachError;
}

/** 持ち主に見せる一時的な URL（10分） */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .storage.from(PHOTO_BUCKET)
    .createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
