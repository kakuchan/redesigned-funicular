import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { mailSender, sendQuietly } = await import("./mailer");

afterEach(() => vi.unstubAllGlobals());

describe("mailSender", () => {
  it("既定はログだけで、宛先は出さない", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await mailSender({})({ to: "owner@example.test", subject: "件名", text: "本文" });
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0])).not.toContain("owner@example.test");
    expect(String(info.mock.calls[0])).not.toContain("本文");
  });

  it("resend は API キーがなければ失敗する", () => {
    expect(() => mailSender({ MAIL_PROVIDER: "resend" })).toThrow("RESEND_API_KEY");
  });

  it("resend に送る", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await mailSender({ MAIL_PROVIDER: "resend", RESEND_API_KEY: "k", MAIL_FROM: "a@b.c" })({
      to: "o@example.test",
      subject: "s",
      text: "t",
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(init.body))).toEqual({ from: "a@b.c", to: ["o@example.test"], subject: "s", text: "t" });
  });

  it("送信に失敗しても sendQuietly は例外を出さない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      sendQuietly({ to: "x", subject: "s", text: "t" }, async () => {
        throw new Error("down");
      }),
    ).resolves.toBeUndefined();
  });
});
