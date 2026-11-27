import { expect, test } from "@playwright/test";
import { hasDb } from "./helpers";

// ID は supabase/seed.sql と合わせてある
const ACTIVE = "E2eActiveTagAbcd";
const LOST = "E2eLostModeTagAb";
const NEW = "E2eNewTagAbcdefg";
const STOPPED = "E2eStoppedTagAbc";

test.describe("タグを読んだときの画面", () => {
  test.skip(
    !hasDb,
    "ローカルの Supabase が起動していません（npm run db:start）",
  );

  test("有効なタグは拾った人用ページになる", async ({ page }) => {
    const res = await page.goto(`/t/${ACTIVE}`);
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
    expect(res?.headers()["referrer-policy"]).toBe("no-referrer");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("青い水筒");
    await expect(page.getByText("〇〇小の子どもの水筒です。連絡お願いします")).toBeVisible();
    await expect(page.getByRole("link", { name: "持ち主に知らせる" })).toHaveAttribute(
      "href",
      `/t/${ACTIVE}/contact`,
    );
    await expect(page.getByText("持ち主がさがしています")).toHaveCount(0);

    // 持ち主の情報がページに含まれない
    const html = await page.content();
    expect(html).not.toContain("e2e-owner@example.test");
    expect(html).not.toContain("00000000-0000-4000-8000-00000000e2e0");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  test("紛失モードは強調し、持ち主の文言は文字として出す", async ({ page }) => {
    await page.goto(`/t/${LOST}`);
    await expect(page.getByText("持ち主がさがしています")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("<b>黒い傘</b>");
    await expect(page.getByText("<script>window.__xss = 1</script>")).toBeVisible();
    expect(await page.evaluate(() => "__xss" in window)).toBe(false);
  });

  test("未登録のタグは登録への入口を出す", async ({ page }) => {
    await page.goto(`/t/${NEW}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "まだ登録されていないタグです",
    );
    await expect(page.getByRole("link", { name: "登録する" })).toHaveAttribute(
      "href",
      `/register/${NEW}`,
    );
  });

  test("停止中のタグは使えないと出し、持ち物の情報は出さない", async ({ page }) => {
    await page.goto(`/t/${STOPPED}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "このタグは今は使えません",
    );
    expect(await page.content()).not.toContain("見えてはいけない");
    expect(await page.content()).not.toContain("赤い鍵");
  });

  for (const id of ["E2eNotExistTagAb", "short", "E2eActiveTagAbcd0"]) {
    test(`見つからない ID（${id}）`, async ({ page }) => {
      await page.goto(`/t/${id}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "タグが見つかりません",
      );
    });
  }
});
