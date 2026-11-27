/**
 * ブラウザにも渡してよい公開設定だけを扱う。
 * 秘密の鍵（サービスロールキーなど）はここに置かない。
 */
export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

type Source = Record<string, string | undefined>;

export function readPublicEnv(source: Source): PublicEnv {
  const supabaseUrl = source.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const missing = [
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !supabasePublishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(
      `環境変数が設定されていません: ${missing.join(", ")}（.env.example を参照）`,
    );
  }

  try {
    new URL(supabaseUrl as string);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL が URL の形式ではありません");
  }

  return {
    supabaseUrl: supabaseUrl as string,
    supabasePublishableKey: supabasePublishableKey as string,
  };
}

/**
 * Next.js は NEXT_PUBLIC_ の値をビルド時に埋め込むため、
 * process.env.NAME の形で1つずつ参照する必要がある。
 */
export function publicEnv(): PublicEnv {
  return readPublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
