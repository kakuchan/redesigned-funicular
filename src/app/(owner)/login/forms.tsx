"use client";

import { useActionState } from "react";
import { sendCode, verifyCode, type LoginState } from "./actions";

export function EmailForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendCode, {});
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email">メールアドレス</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
      />
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="button" type="submit" disabled={pending}>
        確認コードを送る
      </button>
    </form>
  );
}

export function CodeForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(verifyCode, {});
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="code">確認コード（6桁）</label>
      <input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        required
      />
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="button" type="submit" disabled={pending}>
        ログインする
      </button>
    </form>
  );
}
