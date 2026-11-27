"use client";

import { useActionState, useEffect, useRef } from "react";
import { MESSAGE_MAX } from "@/lib/conversations/labels";

type FormState = { error?: string; sent?: number };

/** 会話の返信フォーム（拾った人・持ち主の両方で使う） */
export function MessageForm({
  action,
  label,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.sent) formRef.current?.reset();
  }, [state.sent]);

  return (
    <form ref={formRef} action={formAction} className="form">
      <label htmlFor="body">{label}</label>
      <textarea id="body" name="body" rows={3} maxLength={MESSAGE_MAX} required />
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="button" type="submit" disabled={pending}>
        送る
      </button>
    </form>
  );
}
