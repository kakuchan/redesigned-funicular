import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * ログインのセッション（cookie）を更新する。
 * 拾った人用ページ（/t/）は未ログインで使うので通さない。
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // 期限切れのトークンをここで更新する。結果は使わない（判定は各ページで行う）。
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/items/:path*", "/register/:path*", "/login/:path*", "/conversations/:path*", "/account"],
};
