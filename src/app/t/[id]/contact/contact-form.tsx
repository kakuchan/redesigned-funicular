"use client";

import { useActionState, useState } from "react";
import { ITEM_LOCATIONS, MESSAGE_MAX } from "@/lib/conversations/labels";
import { resizeToJpeg } from "@/lib/photos/resize";
import type { ContactState } from "./actions";

type PositionState =
  | { kind: "off" }
  | { kind: "loading" }
  | { kind: "ok"; latitude: number; longitude: number }
  | { kind: "error"; message: string };

export function ContactForm({
  action,
}: {
  action: (prev: ContactState, form: FormData) => Promise<ContactState>;
}) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(action, {});
  const [position, setPosition] = useState<PositionState>({ kind: "off" });
  const [photo, setPhoto] = useState<"none" | "loading" | "ready" | "error">("none");

  async function onPhotoChange(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) {
      setPhoto("none");
      return;
    }
    setPhoto("loading");
    try {
      // 縮小して位置情報を消した JPEG に置き換える
      const resized = await resizeToJpeg(file);
      const dt = new DataTransfer();
      dt.items.add(resized);
      input.files = dt.files;
      setPhoto("ready");
    } catch {
      input.value = "";
      setPhoto("error");
    }
  }

  function togglePosition(on: boolean) {
    if (!on) {
      setPosition({ kind: "off" });
      return;
    }
    if (!("geolocation" in navigator)) {
      setPosition({ kind: "error", message: "この端末では位置情報を使えません" });
      return;
    }
    setPosition({ kind: "loading" });
    navigator.geolocation.getCurrentPosition(
      (p) => setPosition({ kind: "ok", latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => setPosition({ kind: "error", message: "位置情報を取れませんでした。送らなくても大丈夫です" }),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <form action={formAction} className="form">
      <fieldset className="choices">
        <legend>どこにありますか</legend>
        {Object.entries(ITEM_LOCATIONS).map(([value, label]) => (
          <label key={value} className="choice">
            <input type="radio" name="location" value={value} required />
            {label}
          </label>
        ))}
      </fieldset>

      <label htmlFor="body">持ち主へのひとこと（なくても大丈夫です）</label>
      <textarea
        id="body"
        name="body"
        rows={3}
        maxLength={MESSAGE_MAX}
        placeholder="例: 〇〇駅の改札の窓口に届けました"
      />

      <label htmlFor="photo">写真（なくても大丈夫です）</label>
      <input
        id="photo"
        name="photo"
        type="file"
        accept="image/*"
        onChange={(e) => onPhotoChange(e.currentTarget)}
      />
      {photo === "loading" && <p className="note">写真を準備しています…</p>}
      {photo === "ready" && <p className="note">写真の位置情報などは消してから送ります</p>}
      {photo === "error" && <p className="note">この写真は使えませんでした。別の写真を選ぶか、写真なしで送ってください</p>}

      <label className="choice">
        <input
          type="checkbox"
          name="sharePosition"
          checked={position.kind !== "off"}
          onChange={(e) => togglePosition(e.target.checked)}
        />
        今いる場所（位置情報）も送る
      </label>
      {position.kind === "loading" && <p className="note">位置情報を取っています…</p>}
      {position.kind === "ok" && <p className="note">位置情報を付けて送ります</p>}
      {position.kind === "error" && <p className="note">{position.message}</p>}
      {position.kind === "ok" && (
        <>
          <input type="hidden" name="latitude" value={position.latitude} />
          <input type="hidden" name="longitude" value={position.longitude} />
        </>
      )}

      <p className="note">
        あなたの名前や連絡先を書く必要はありません。持ち主にも伝わりません。
      </p>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="button" type="submit" disabled={pending || position.kind === "loading" || photo === "loading"}>
        持ち主に知らせる
      </button>
    </form>
  );
}
