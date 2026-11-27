"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/next-path";
import { normalizeEmail, normalizeOtp } from "@/lib/items/validate";
import { createClient } from "@/lib/supabase/server";

const PENDING_EMAIL_COOKIE = "login_email";

export type LoginState = { error?: string };

export async function sendCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = normalizeEmail(form.get("email"));
  const next = safeNextPath(form.get("next"));
  if (!email) return { error: "メールアドレスの形を確かめてください" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    // 回数制限などの理由は利用者に細かく出さない（アドレスの有無を探られないように）
    console.error("signInWithOtp failed", error.status);
    return { error: "コードを送れませんでした。少し時間をおいてもう一度お試しください" };
  }

  (await cookies()).set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/login",
    maxAge: 60 * 60,
  });
  redirect(`/login/verify?next=${encodeURIComponent(next)}`);
}

export async function verifyCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const next = safeNextPath(form.get("next"));
  const token = normalizeOtp(form.get("code"));
  const cookieStore = await cookies();
  const email = cookieStore.get(PENDING_EMAIL_COOKIE)?.value;

  if (!email) return { error: "もう一度メールアドレスから入れてください" };
  if (!token) return { error: "6桁の数字を入れてください" };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: "コードが違うか、期限が切れています" };

  cookieStore.delete({ name: PENDING_EMAIL_COOKIE, path: "/login" });
  redirect(next);
}

export async function pendingEmail(): Promise<string | null> {
  return (await cookies()).get(PENDING_EMAIL_COOKIE)?.value ?? null;
}
