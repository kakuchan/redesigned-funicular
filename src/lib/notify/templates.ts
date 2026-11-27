import { ITEM_LOCATIONS, type ItemLocation } from "@/lib/conversations/labels";

/**
 * 持ち主への通知メールの文面。
 * 拾った人の本文はメールに入れない（転送・誤送信で広がらないように）。サイトで読んでもらう。
 */
export function foundMail(args: {
  itemName: string;
  location: ItemLocation | null;
  hasPosition: boolean;
  hasPhoto?: boolean;
  conversationUrl: string;
}) {
  const lines = [
    `「${args.itemName}」を見つけた人から連絡が届きました。`,
    "",
    args.location ? `どこにあるか: ${ITEM_LOCATIONS[args.location]}` : null,
    args.hasPosition ? "位置情報も送られています。" : null,
    args.hasPhoto ? "写真も送られています。" : null,
    "",
    "メッセージを読んで返信するには、こちらを開いてください（ログインが必要です）。",
    args.conversationUrl,
    "",
    "相手にあなたの名前や連絡先は伝わりません。会うときは人の多い場所や、施設の窓口を使ってください。",
    "",
    "-- ",
    "持ち物タグ",
  ].filter((line): line is string => line !== null);
  return {
    subject: `【持ち物タグ】「${args.itemName}」が見つかりました`,
    text: lines.join("\n"),
  };
}

export function replyMail(args: { itemName: string; conversationUrl: string }) {
  return {
    subject: `【持ち物タグ】「${args.itemName}」の件で返信が届きました`,
    text: [
      `「${args.itemName}」を見つけた人から返信が届きました。`,
      "",
      "読むには、こちらを開いてください（ログインが必要です）。",
      args.conversationUrl,
      "",
      "-- ",
      "持ち物タグ",
    ].join("\n"),
  };
}

export function reportMail(args: { reporter: "owner" | "finder"; conversationId: string; reason: string }) {
  return {
    subject: "【持ち物タグ】通報が届きました",
    text: [
      `通報した人: ${args.reporter === "owner" ? "持ち主" : "見つけた人"}`,
      `会話の ID: ${args.conversationId}`,
      "",
      "理由:",
      args.reason,
      "",
      "Supabase の reports テーブルで確認し、対応したら status を done にしてください。",
    ].join("\n"),
  };
}
