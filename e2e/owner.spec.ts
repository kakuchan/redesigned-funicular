import { expect, test } from "@playwright/test";
import { createTag, hasDb, login, registerItem, uniqueEmail } from "./helpers";

test.describe("持ち主の登録と設定", () => {
  test.skip(!hasDb, "ローカルの Supabase が起動していません（npm run db:start）");

  test("タグを読んで登録すると、拾った人用ページになる", async ({ page }) => {
    const { tagId } = await registerItem(page, "青い水筒", "連絡お願いします");
    await expect(page.getByText("登録しました")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("青い水筒");

    await page.goto(`/t/${tagId}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("青い水筒");
    await expect(page.getByText("連絡お願いします")).toBeVisible();
  });

  test("名前の変更・なくした表示・一時停止・解除ができる", async ({ page }) => {
    const { tagId } = await registerItem(page, "黒い傘");

    await page.getByLabel(/持ち物の名前/).fill("黒い折りたたみ傘");
    await page.getByRole("button", { name: "保存する" }).click();
    await expect(page.getByText("保存しました")).toBeVisible();

    await page.getByRole("button", { name: /なくした/ }).click();
    await expect(page.getByRole("button", { name: /「さがしています」をやめる/ })).toBeVisible();
    await page.goto(`/t/${tagId}`);
    await expect(page.getByText("持ち主がさがしています")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("黒い折りたたみ傘");

    await page.goBack();
    await page.getByRole("button", { name: "一時停止する" }).click();
    await expect(page.getByRole("button", { name: "受け付けを再開する" })).toBeVisible();
    await page.goto(`/t/${tagId}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("このタグは今は使えません");

    await page.goto("/items");
    await expect(page.getByText("一時停止中")).toBeVisible();
    await page.getByRole("link", { name: /黒い折りたたみ傘/ }).click();
    await page.getByRole("button", { name: "登録を解除する" }).click();
    await page.getByRole("button", { name: "本当に解除する" }).click();
    await expect(page).toHaveURL("/items");
    await expect(page.getByText("まだ登録した持ち物はありません")).toBeVisible();

    await page.goto(`/t/${tagId}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "まだ登録されていないタグです",
    );
  });

  test("他人の持ち物の設定画面は開けない", async ({ page, browser }) => {
    await registerItem(page, "赤い鍵");
    const itemUrl = page.url().replace("?registered=1", "");

    const other = await browser.newPage();
    await login(other, uniqueEmail("other"));
    await other.goto(itemUrl);
    await expect(other.getByText("赤い鍵")).toHaveCount(0);
    await other.close();
  });

  test("登録済みのタグは他の人が登録できない", async ({ page, browser }) => {
    const { tagId } = await registerItem(page, "白い帽子");
    const other = await browser.newPage();
    await login(other, uniqueEmail("other"));
    await other.goto(`/register/${tagId}`);
    await expect(other.getByText("このタグはすでに登録されているか、今は使えません")).toBeVisible();
    await expect(other.getByRole("button", { name: "登録する" })).toHaveCount(0);
    await other.close();
  });

  test("ログインしていないと持ち物の画面はログインへ送られる", async ({ page }) => {
    await page.goto("/items");
    await expect(page).toHaveURL(/\/login\?next=%2Fitems/);
  });

  test("間違ったコードではログインできない", async ({ page }) => {
    await createTag();
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill(uniqueEmail());
    await page.getByRole("button", { name: "確認コードを送る" }).click();
    await page.getByLabel("確認コード（6桁）").fill("000000");
    await page.getByRole("button", { name: "ログインする" }).click();
    await expect(page.getByText("コードが違うか、期限が切れています")).toBeVisible();
  });

  test("ログイン後の戻り先に外部サイトは使えない", async ({ page }) => {
    await login(page, uniqueEmail(), "https://evil.example/");
    await expect(page).toHaveURL("/items");
  });
});
