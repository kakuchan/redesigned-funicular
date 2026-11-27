import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Browser } from "@playwright/test";
import { admin, hasDb, registerItem } from "./helpers";

/** 送信元の IP を変えた「拾った人」のページ（x-forwarded-for で区別する） */
async function finderPage(browser: Browser, ip: string) {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
  return context.newPage();
}

async function sendContact(page: Awaited<ReturnType<typeof finderPage>>, tagId: string, body: string) {
  await page.goto(`/t/${tagId}/contact`);
  await page.getByLabel("今、手元に持っています").check();
  await page.getByLabel(/持ち主へのひとこと/).fill(body);
  await page.getByRole("button", { name: "持ち主に知らせる" }).click();
}

test.describe("安全のしくみ", () => {
  test.skip(!hasDb, "ローカルの Supabase が起動していません（npm run db:start）");

  test("写真は位置情報（EXIF）を消して保存し、持ち主にだけ見える", async ({ page, browser }) => {
    const { tagId } = await registerItem(page, "写真の水筒");
    const finder = await finderPage(browser, "198.51.100.10");

    // ブラウザで JPEG を作り、GPS 入りの EXIF を差し込んだファイルを用意する
    await finder.goto("/");
    const base64 = await finder.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 40;
      c.height = 30;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#3366ff";
      ctx.fillRect(0, 0, 40, 30);
      return c.toDataURL("image/jpeg").split(",")[1];
    });
    const jpeg = Buffer.from(base64, "base64");
    const exifPayload = Buffer.from("Exif\0\0GPSLatitude=35.68;GPSLongitude=139.76", "latin1");
    const app1 = Buffer.concat([
      Buffer.from([0xff, 0xe1, (exifPayload.length + 2) >> 8, (exifPayload.length + 2) & 0xff]),
      exifPayload,
    ]);
    const withExif = Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
    // 日本語を含むパスだと setInputFiles が失敗するので、一時フォルダに置く
    const file = join(mkdtempSync(join(tmpdir(), "e2e-photo-")), "with-gps.jpg");
    writeFileSync(file, withExif);

    await finder.goto(`/t/${tagId}/contact`);
    await finder.getByLabel("今、手元に持っています").check();
    await finder.waitForLoadState("networkidle");
    await finder.locator("#photo").setInputFiles(file);
    await expect(finder.getByText("写真の位置情報などは消してから送ります")).toBeVisible();
    await finder.getByRole("button", { name: "持ち主に知らせる" }).click();
    await expect(finder.getByText("持ち主に届きました")).toBeVisible();
    await expect(finder.getByText("写真を送りました")).toBeVisible();
    expect(await finder.locator("img").count()).toBe(0);

    // 保存された写真に位置情報が残っていない
    const { data: msg } = await admin()
      .from("messages")
      .select("photo_path, conversation_id, conversations!inner(items!inner(tag_id))")
      .eq("conversations.items.tag_id", tagId)
      .not("photo_path", "is", null)
      .single();
    const { data: blob } = await admin().storage.from("photos").download(msg!.photo_path!);
    const stored = Buffer.from(await blob!.arrayBuffer()).toString("latin1");
    expect(stored).not.toContain("GPS");
    expect(stored).not.toContain("Exif");

    // 持ち主には写真が見える
    await page.goto(`/conversations/${msg!.conversation_id}`);
    await expect(page.getByRole("img", { name: "見つけた人が送った写真" })).toBeVisible();
  });

  test("同じタグへの連絡が多すぎると止まる", async ({ page, browser }) => {
    const { tagId } = await registerItem(page, "回数制限の傘");
    for (let i = 0; i < 5; i++) {
      const finder = await finderPage(browser, `198.51.100.${20 + i}`);
      await sendContact(finder, tagId, `${i + 1}回目`);
      await expect(finder.getByText("持ち主に届きました")).toBeVisible();
    }
    const sixth = await finderPage(browser, "198.51.100.30");
    await sendContact(sixth, tagId, "6回目");
    await expect(sixth.getByText(/連絡が多すぎます/)).toBeVisible();
  });

  test("ブロックした相手は連絡できず、別の人はできる。通報もできる", async ({ page, browser }) => {
    const { tagId } = await registerItem(page, "ブロックの帽子");
    const bad = await finderPage(browser, "203.0.113.66");
    await sendContact(bad, tagId, "いたずら");
    await expect(bad.getByText("持ち主に届きました")).toBeVisible();
    const badUrl = bad.url();

    const { data: conv } = await admin()
      .from("conversations")
      .select("id, items!inner(tag_id)")
      .eq("items.tag_id", tagId)
      .single();
    await page.goto(`/conversations/${conv!.id}`);

    await page.getByText("困ったことがあれば通報する").click();
    await page.getByLabel("どんなことがありましたか").fill("いたずらの連絡です");
    await page.getByRole("button", { name: "運営に通報する" }).click();
    await expect(page.getByText("通報を受け付けました")).toBeVisible();
    const { count } = await admin()
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conv!.id);
    expect(count).toBe(1);

    await page.getByRole("button", { name: "この相手をブロックする" }).click();
    await page.getByRole("button", { name: "ブロックする", exact: true }).click();
    await expect(page.getByText("この相手をブロックしました")).toBeVisible();

    // ブロックされた相手: 返信も新しい連絡もできない（理由は見せない）
    await bad.goto(badUrl);
    await expect(bad.getByLabel("持ち主へのメッセージ")).toHaveCount(0);
    await sendContact(bad, tagId, "もう一度");
    await expect(bad.getByText("このタグには今は連絡できません")).toBeVisible();

    // 別の人は連絡できる
    const good = await finderPage(browser, "203.0.113.77");
    await sendContact(good, tagId, "拾いました");
    await expect(good.getByText("持ち主に届きました")).toBeVisible();

    // 拾った人側からも通報できる
    await good.getByText("困ったことがあれば通報する").click();
    await good.getByLabel("どんなことがありましたか").fill("テスト");
    await good.getByRole("button", { name: "運営に通報する" }).click();
    await expect(good.getByText("通報を受け付けました")).toBeVisible();
  });

  test("自動削除の入口は秘密の文字列がないと動かない", async ({ request }) => {
    expect((await request.get("/api/cron/purge")).status()).toBe(401);
    expect(
      (await request.get("/api/cron/purge", { headers: { authorization: "Bearer wrong" } })).status(),
    ).toBe(401);
    const ok = await request.get("/api/cron/purge", {
      headers: { authorization: "Bearer e2e-cron-secret" },
    });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).ok).toBe(true);
  });
});
