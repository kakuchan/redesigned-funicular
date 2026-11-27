import "server-only";

/**
 * 通知メールの送信。送り方は MAIL_PROVIDER で切り替える（D-010）。
 * - resend: Resend の API（本番）。RESEND_API_KEY と MAIL_FROM が必要
 * - mailpit: ローカルのテスト用受信箱（MAILPIT_URL）
 * - log（既定）: 送らずにログへ件名だけ出す
 */
export type Mail = { to: string; subject: string; text: string };

export type MailSender = (mail: Mail) => Promise<void>;

export function mailSender(env: Record<string, string | undefined> = process.env): MailSender {
  const provider = env.MAIL_PROVIDER ?? "log";
  const from = env.MAIL_FROM ?? "持ち物タグ <no-reply@example.com>";

  if (provider === "resend") {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY が設定されていません");
    return async (mail) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
      });
      if (!res.ok) throw new Error(`メールを送れませんでした（${res.status}）`);
    };
  }

  if (provider === "mailpit") {
    const base = env.MAILPIT_URL ?? "http://127.0.0.1:54324";
    return async (mail) => {
      const res = await fetch(`${base}/api/v1/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: { Email: "no-reply@example.test", Name: "持ち物タグ" },
          To: [{ Email: mail.to }],
          Subject: mail.subject,
          Text: mail.text,
        }),
      });
      if (!res.ok) throw new Error(`メールを送れませんでした（${res.status}）`);
    };
  }

  return async (mail) => {
    // 宛先と本文はログに残さない
    console.info(`[mail:log] ${mail.subject}`);
  };
}

/** 送信に失敗しても、利用者の操作（メッセージの保存）は失敗にしない。 */
export async function sendQuietly(mail: Mail, send: MailSender = mailSender()) {
  try {
    await send(mail);
  } catch (error) {
    console.error("通知メールの送信に失敗しました", error instanceof Error ? error.message : error);
  }
}
