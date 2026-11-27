import { expect, test } from "@playwright/test";
import { admin, hasDb, registerItem } from "./helpers";

test("利用規約とプライバシーポリシーがどの画面からも開ける", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "利用規約" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("利用規約");
  await page.getByRole("link", { name: "プライバシーポリシー" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("プライバシーポリシー");
});

test.describe("退会", () => {
  test.skip(!hasDb, "ローカルの Supabase が起動していません（npm run db:start）");

  test("退会すると持ち物とやり取りが消え、タグは未登録に戻る", async ({ page, browser }) => {
    const { tagId, email } = await registerItem(page, "退会の水筒");

    const finder = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "192.0.2.44" } })).newPage();
    await finder.goto(`/t/${tagId}/contact`);
    await finder.getByLabel("今、手元に持っています").check();
    await finder.getByRole("button", { name: "持ち主に知らせる" }).click();
    await expect(finder.getByText("持ち主に届きました")).toBeVisible();
    const finderUrl = finder.url().replace("?sent=1", "");

    await page.getByRole("link", { name: "アカウント" }).click();
    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: "退会する" }).click();
    await page.getByRole("button", { name: "本当に退会する" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/items");
    await expect(page).toHaveURL(/\/login/);

    await finder.goto(`/t/${tagId}`);
    await expect(finder.getByRole("heading", { level: 1 })).toHaveText("まだ登録されていないタグです");
    await finder.goto(finderUrl);
    await expect(finder.getByText("持ち主とのやり取り")).toHaveCount(0);

    const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
    expect(data.users.some((u) => u.email === email)).toBe(false);
  });
});
