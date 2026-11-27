import { expect, test } from "@playwright/test";
import { hasDb, registerItem, waitForMail } from "./helpers";

test.describe("拾った人からの連絡と中継の会話", () => {
  test.skip(!hasDb, "ローカルの Supabase が起動していません（npm run db:start）");

  test("拾った人が知らせる → 持ち主にメール → 双方向のやり取り → 受け取り", async ({
    page,
    browser,
  }) => {
    const { tagId, email } = await registerItem(page, "青い水筒");

    // 拾った人（別のブラウザ。位置情報を許可）
    const finderContext = await browser.newContext({
      geolocation: { latitude: 35.681236, longitude: 139.767125 },
      permissions: ["geolocation"],
    });
    const finder = await finderContext.newPage();
    await finder.goto(`/t/${tagId}`);
    await finder.getByRole("link", { name: "持ち主に知らせる" }).click();
    await finder.getByLabel("お店・駅・交番などに届けました").check();
    await finder.getByLabel(/持ち主へのひとこと/).fill("東京駅の忘れ物センターに届けました");
    await finder.getByLabel(/位置情報/).check();
    await expect(finder.getByText("位置情報を付けて送ります")).toBeVisible();
    await finder.getByRole("button", { name: "持ち主に知らせる" }).click();

    await expect(finder).toHaveURL(/\/c\/[A-Za-z0-9_-]{43}\?sent=1/);
    await expect(finder.getByText("持ち主に届きました")).toBeVisible();
    await expect(finder.getByText("東京駅の忘れ物センターに届けました")).toBeVisible();
    const finderUrl = finder.url().replace("?sent=1", "");
    const finderHtml = await finder.content();
    expect(finderHtml).not.toContain(email);
    expect(finderHtml).not.toContain("35.68");

    // 持ち主へのメール（本文はメールに入れない）
    const mail = await waitForMail(email, (m) => m.Subject.includes("見つかりました"));
    expect(mail.Subject).toContain("青い水筒");
    expect(mail.Text).toContain("お店・駅・交番などに届けました");
    expect(mail.Text).not.toContain("東京駅の忘れ物センター");
    const link = mail.Text.match(/http:\/\/127\.0\.0\.1:\d+(\/conversations\/[0-9a-f-]+)/)![1];

    // 持ち主が開いて返信
    await page.goto(link);
    await expect(page.getByText("東京駅の忘れ物センターに届けました")).toBeVisible();
    await expect(page.getByRole("link", { name: "送られた位置を地図で見る" })).toHaveAttribute(
      "href",
      /mlat=35\.68124&mlon=139\.76713/,
    );
    await page.getByLabel("見つけた人へのメッセージ").fill("ありがとうございます！明日取りに行きます");
    await page.getByRole("button", { name: "送る" }).click();
    await expect(page.getByText("ありがとうございます！明日取りに行きます")).toBeVisible();

    // 拾った人に返信が見える → 返信すると持ち主にメール
    await finder.goto(finderUrl);
    await expect(finder.getByText("ありがとうございます！明日取りに行きます")).toBeVisible();
    await finder.getByLabel("持ち主へのメッセージ").fill("どういたしまして");
    await finder.getByRole("button", { name: "送る" }).click();
    await expect(finder.getByText("どういたしまして")).toBeVisible();
    await waitForMail(email, (m) => m.Subject.includes("返信が届きました"));

    // 同じタグを読み直すと、前のやり取りに戻れる
    await finder.goto(`/t/${tagId}`);
    await expect(finder.getByRole("link", { name: "前に送ったやり取りを見る" })).toHaveAttribute(
      "href",
      new URL(finderUrl).pathname,
    );

    // 受け取り済みにすると、拾った人は返信できない
    await page.reload();
    await page.getByRole("button", { name: /受け取った/ }).click();
    await expect(page.getByText("このやり取りは終わりました")).toBeVisible();
    await finder.goto(finderUrl);
    await expect(finder.getByText("持ち主が受け取りを済ませました")).toBeVisible();
    await expect(finder.getByLabel("持ち主へのメッセージ")).toHaveCount(0);

    // 持ち物の画面に連絡が並ぶ
    await page.getByRole("link", { name: /← 青い水筒/ }).click();
    await expect(page.getByText("終了")).toBeVisible();

    await finderContext.close();
  });

  test("位置情報は既定で送らない・場所の選択は必須", async ({ page, browser }) => {
    const { tagId, email } = await registerItem(page, "黒い傘");
    const finder = await (await browser.newContext()).newPage();
    await finder.goto(`/t/${tagId}/contact`);
    await expect(finder.getByLabel(/位置情報/)).not.toBeChecked();
    await finder.getByRole("button", { name: "持ち主に知らせる" }).click();
    await expect(finder).toHaveURL(`/t/${tagId}/contact`);

    await finder.getByLabel("今、手元に持っています").check();
    await finder.getByRole("button", { name: "持ち主に知らせる" }).click();
    await expect(finder).toHaveURL(/\/c\//);
    await expect(finder.getByText("持ち主に届きました")).toBeVisible();
    await expect(finder.getByRole("listitem").getByText("今、手元に持っています")).toBeVisible();

    const mail = await waitForMail(email, (m) => m.Subject.includes("見つかりました"));
    expect(mail.Text).not.toContain("位置情報");
  });

  test("一時停止中の持ち物には連絡できない", async ({ page, browser }) => {
    const { tagId } = await registerItem(page, "赤い鍵");
    await page.getByRole("button", { name: "一時停止する" }).click();
    await expect(page.getByRole("button", { name: "受け付けを再開する" })).toBeVisible();

    const finder = await (await browser.newContext()).newPage();
    await finder.goto(`/t/${tagId}/contact`);
    await expect(finder.getByRole("heading", { level: 1 })).toHaveText("今は連絡できません");
  });

  test("でたらめな一時リンクは見つからない", async ({ page }) => {
    await page.goto(`/c/${"a".repeat(43)}`);
    await expect(page.getByText("This page could not be found").or(page.getByText("見つかりません"))).toBeVisible();
  });
});
