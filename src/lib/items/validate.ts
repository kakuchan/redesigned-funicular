/** 持ち物の入力チェック。DB の制約と同じ上限にする。 */
export const ITEM_NAME_MAX = 50;
export const PUBLIC_MESSAGE_MAX = 200;

export type ItemInput = { name: string; publicMessage: string };

export type ValidationResult =
  | { ok: true; value: ItemInput }
  | { ok: false; error: string };

export function validateItemInput(form: FormData): ValidationResult {
  const name = String(form.get("name") ?? "").trim();
  const publicMessage = String(form.get("publicMessage") ?? "").trim();

  if (name.length === 0) {
    return { ok: false, error: "持ち物の名前を入れてください" };
  }
  if ([...name].length > ITEM_NAME_MAX) {
    return { ok: false, error: `持ち物の名前は${ITEM_NAME_MAX}文字までです` };
  }
  if ([...publicMessage].length > PUBLIC_MESSAGE_MAX) {
    return { ok: false, error: `ひとことは${PUBLIC_MESSAGE_MAX}文字までです` };
  }
  return { ok: true, value: { name, publicMessage } };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function normalizeOtp(value: unknown): string | null {
  const code = String(value ?? "").replace(/\s/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}
