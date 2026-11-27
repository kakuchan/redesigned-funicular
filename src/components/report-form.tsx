"use client";

import { useActionState } from "react";

type FormState = { error?: string; sent?: number };

/** 通報フォーム。開くまでは畳んでおく。 */
export function ReportForm({
  action,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  if (state.sent) {
    return <p className="note" role="status">通報を受け付けました。運営が確認します。</p>;
  }
  return (
    <details className="report">
      <summary>困ったことがあれば通報する</summary>
      <form action={formAction} className="form">
        <label htmlFor="reason">どんなことがありましたか</label>
        <textarea id="reason" name="reason" rows={3} maxLength={1000} required />
        {state.error && <p className="error" role="alert">{state.error}</p>}
        <button className="button button-secondary" type="submit" disabled={pending}>
          運営に通報する
        </button>
      </form>
    </details>
  );
}
