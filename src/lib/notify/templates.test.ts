import { describe, expect, it } from "vitest";
import { foundMail, replyMail } from "./templates";

describe("通知メールの文面", () => {
  it("見つかった通知には持ち物・場所・リンクが入る", () => {
    const mail = foundMail({
      itemName: "青い水筒",
      location: "handed_in",
      hasPosition: true,
      conversationUrl: "https://example.com/conversations/1",
    });
    expect(mail.subject).toContain("青い水筒");
    expect(mail.text).toContain("お店・駅・交番などに届けました");
    expect(mail.text).toContain("位置情報も送られています");
    expect(mail.text).toContain("https://example.com/conversations/1");
  });

  it("場所・位置がなければその行を出さない", () => {
    const mail = foundMail({
      itemName: "傘",
      location: null,
      hasPosition: false,
      conversationUrl: "https://example.com/c",
    });
    expect(mail.text).not.toContain("どこにあるか");
    expect(mail.text).not.toContain("位置情報");
  });

  it("返信の通知", () => {
    const mail = replyMail({ itemName: "傘", conversationUrl: "https://example.com/c" });
    expect(mail.subject).toContain("返信");
    expect(mail.text).toContain("https://example.com/c");
  });
});
