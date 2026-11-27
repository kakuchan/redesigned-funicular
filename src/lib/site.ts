/** メールに入れるリンクのためのサイトの URL（末尾のスラッシュなし） */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
