import "server-only";
import { cookies } from "next/headers";
import { isTagId } from "@/lib/tags/id";
import { isFinderToken } from "./token";

/**
 * 拾った人が同じタグを読み直したとき、前のやり取りに戻れるようにする cookie。
 * 中身は一時リンクのトークンだけ（7日で消える）。
 */
const name = (tagId: string) => `fc_${tagId}`;

export async function rememberFinderToken(tagId: string, token: string) {
  if (!isTagId(tagId)) return;
  (await cookies()).set(name(tagId), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function rememberedFinderToken(tagId: string): Promise<string | null> {
  if (!isTagId(tagId)) return null;
  const value = (await cookies()).get(name(tagId))?.value;
  return value && isFinderToken(value) ? value : null;
}
