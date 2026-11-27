import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { generateTagId } from "../src/lib/tags/id";

export const hasDb = !!process.env.E2E_HAS_DB;

function admin() {
  return createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SECRET_KEY!, {
    auth: { persistSession: false },
  });
}

/** テスト用に新しいタグを作る（テストごとに別のタグを使う） */
export async function createTag(status: "unregistered" | "active" | "suspended" = "unregistered") {
  const id = generateTagId();
  const { error } = await admin().from("tags").insert({ id, status, lot: "e2e" });
  if (error) throw new Error(error.message);
  return id;
}

export function uniqueEmail(prefix = "owner") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

type MailMessage = { Subject: string; Text: string; HTML: string };

/** テスト用受信箱（Mailpit）から、条件に合う最新のメールを待って取り出す */
export async function waitForMail(
  email: string,
  match: (m: MailMessage) => boolean = () => true,
): Promise<MailMessage> {
  const base = process.env.E2E_MAILPIT_URL!;
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const list = (await res.json()) as { messages?: { ID: string }[] };
    for (const item of list.messages ?? []) {
      const msg = (await (await fetch(`${base}/api/v1/message/${item.ID}`)).json()) as MailMessage;
      if (match(msg)) return msg;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`メールが届きません: ${email}`);
}

/** 最新の確認コード */
export async function latestCode(email: string): Promise<string> {
  const msg = await waitForMail(email, (m) => /\b\d{6}\b/.test(m.Text || m.HTML));
  return (msg.Text || msg.HTML).match(/\b(\d{6})\b/)![1];
}

/**
 * 確認コードでログインする。すでにログイン画面にいればそのまま、
 * いなければ /login を開く（next を指定すると、ログイン後そこへ戻る）。
 */
export async function login(page: Page, email: string, next?: string) {
  if (next !== undefined || !new URL(page.url()).pathname.startsWith("/login")) {
    await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByRole("button", { name: "確認コードを送る" }).click();
  await expect(page).toHaveURL(/\/login\/verify/);
  await page.getByLabel("確認コード（6桁）").fill(await latestCode(email));
  await page.getByRole("button", { name: "ログインする" }).click();
}

/** タグを登録した状態を作る */
export async function registerItem(page: Page, name: string, message = "") {
  const tagId = await createTag();
  const email = uniqueEmail();
  await page.goto(`/t/${tagId}`);
  await page.getByRole("link", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/login/);
  await login(page, email);
  await expect(page).toHaveURL(`/register/${tagId}`);
  await page.getByLabel(/持ち物の名前/).fill(name);
  if (message) await page.getByLabel(/拾った人に見せるひとこと/).fill(message);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/items\/[0-9a-f-]+\?registered=1/);
  return { tagId, email };
}
