"use client";

import { useState } from "react";

/** 取り消せない操作は、ブラウザのダイアログを使わず2回押しで確かめる。 */
export function ConfirmButton({
  action,
  label,
  confirmLabel,
}: {
  action: () => Promise<void>;
  label: string;
  confirmLabel: string;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button className="button button-danger" type="button" onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="confirm">
      <button className="button button-danger" type="submit">
        {confirmLabel}
      </button>
      <button className="button button-secondary" type="button" onClick={() => setArmed(false)}>
        やめる
      </button>
    </form>
  );
}
