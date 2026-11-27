/**
 * タグ ID の生成。
 *
 * - 暗号学的に安全な乱数（crypto.getRandomValues）だけを使う。
 * - 見間違えやすい文字（0 O 1 l I）は使わない。台紙に一部を印字するため。
 * - 57 種類 × 16 文字 ≒ 93 ビット。総当たりで他人のタグを見つけることはできない。
 * - DB の制約（^[0-9A-Za-z]{12,32}$）に合う。
 */
export const TAG_ID_ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const TAG_ID_LENGTH = 16;

const ALPHABET_SIZE = TAG_ID_ALPHABET.length;
// 256 を割り切れる最大の倍数。これ以上の値は捨てて偏りをなくす。
const UNBIASED_LIMIT = 256 - (256 % ALPHABET_SIZE);

type RandomSource = (bytes: Uint8Array) => Uint8Array;

const secureRandom: RandomSource = (bytes) => crypto.getRandomValues(bytes);

export function generateTagId(random: RandomSource = secureRandom): string {
  let id = "";
  const buffer = new Uint8Array(TAG_ID_LENGTH * 2);
  while (id.length < TAG_ID_LENGTH) {
    random(buffer);
    for (const byte of buffer) {
      if (byte >= UNBIASED_LIMIT) continue;
      id += TAG_ID_ALPHABET[byte % ALPHABET_SIZE];
      if (id.length === TAG_ID_LENGTH) break;
    }
  }
  return id;
}

const TAG_ID_PATTERN = new RegExp(
  `^[${TAG_ID_ALPHABET}]{${TAG_ID_LENGTH}}$`,
);

export function isTagId(value: string): boolean {
  return TAG_ID_PATTERN.test(value);
}
