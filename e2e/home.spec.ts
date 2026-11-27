import { expect, test } from "@playwright/test";

test("トップページがスマホ表示で開ける", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("持ち物タグ");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");

  // 横スクロールが出ないこと
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
