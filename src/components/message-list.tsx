import { ITEM_LOCATIONS, isItemLocation, mapUrl } from "@/lib/conversations/labels";

export type MessageView = {
  id: string;
  sender: "finder" | "owner";
  body: string;
  itemLocation: string | null;
  createdAt: string;
  /** 持ち主にだけ渡す。拾った人の画面では常に null */
  position: { latitude: number; longitude: number } | null;
  hasPosition: boolean;
  /** 持ち主にだけ渡す一時 URL。拾った人の画面では常に null */
  photoUrl: string | null;
  hasPhoto: boolean;
};

const timeFormat = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

/** 会話のメッセージ一覧。viewer から見て自分の発言を右に寄せる。 */
export function MessageList({
  messages,
  viewer,
}: {
  messages: MessageView[];
  viewer: "finder" | "owner";
}) {
  return (
    <ol className="messages">
      {messages.map((m) => {
        const mine = m.sender === viewer;
        const who = mine ? "あなた" : m.sender === "owner" ? "持ち主" : "見つけた人";
        return (
          <li key={m.id} className={mine ? "message mine" : "message"}>
            <p className="message-meta">
              {who}・<time dateTime={m.createdAt}>{timeFormat.format(new Date(m.createdAt))}</time>
            </p>
            {m.itemLocation && isItemLocation(m.itemLocation) && (
              <p className="message-location">{ITEM_LOCATIONS[m.itemLocation]}</p>
            )}
            {m.body && <p className="message-body">{m.body}</p>}
            {m.photoUrl ? (
              // 署名付きの一時 URL なので next/image の最適化は通さない
              // eslint-disable-next-line @next/next/no-img-element
              <img className="message-photo" src={m.photoUrl} alt="見つけた人が送った写真" />
            ) : (
              m.hasPhoto && <p className="note">写真を送りました</p>
            )}
            {m.position ? (
              <p className="note">
                <a href={mapUrl(m.position.latitude, m.position.longitude)} target="_blank" rel="noreferrer noopener">
                  送られた位置を地図で見る
                </a>
              </p>
            ) : (
              m.hasPosition && <p className="note">位置情報を送りました</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
