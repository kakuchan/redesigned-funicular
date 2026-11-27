"use client";

import { useActionState } from "react";
import { ITEM_NAME_MAX, PUBLIC_MESSAGE_MAX } from "@/lib/items/validate";

type FormState = { error?: string; saved?: boolean };

export function ItemForm({
  action,
  submitLabel,
  defaults,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  defaults?: { name: string; publicMessage: string };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="form">
      <label htmlFor="name">持ち物の名前（例: 青い水筒）</label>
      <input
        id="name"
        name="name"
        required
        maxLength={ITEM_NAME_MAX}
        defaultValue={defaults?.name}
      />
      <label htmlFor="publicMessage">拾った人に見せるひとこと（なくても大丈夫です）</label>
      <textarea
        id="publicMessage"
        name="publicMessage"
        rows={3}
        maxLength={PUBLIC_MESSAGE_MAX}
        defaultValue={defaults?.publicMessage}
        placeholder="例: 見つけてくれてありがとうございます。連絡をお願いします。"
      />
      <p className="note">
        お名前・学校名・クラス・住所・電話番号は書かないでください。このひとことはタグを読んだ人なら誰でも見られます。
      </p>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.saved && <p role="status">保存しました</p>}
      <button className="button" type="submit" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}
