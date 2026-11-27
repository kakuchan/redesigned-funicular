/**
 * JPEG からメタデータ（EXIF の位置情報・撮影機種など）を取り除く。
 * ブラウザ側で描き直して JPEG にしているが、念のためサーバーでも消す（設計書 §4）。
 *
 * 残すのは画像の表示に必要なセグメント（SOI, DQT, SOF, DHT, SOS 以降, DRI, APP0(JFIF)）だけ。
 * APP1(EXIF/XMP)〜APP15 とコメント(COM)は捨てる。
 */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function stripJpegMetadata(input: Uint8Array): Uint8Array {
  if (!isJpeg(input)) throw new Error("JPEG ではありません");
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i < input.length) {
    if (input[i] !== 0xff) throw new Error("JPEG の形が壊れています");
    // 埋め草の 0xFF を飛ばす
    while (input[i] === 0xff && input[i + 1] === 0xff) i++;
    const marker = input[i + 1];
    if (marker === undefined) throw new Error("JPEG の形が壊れています");

    // SOS（画像データの始まり）以降はそのまま写す
    if (marker === 0xda) {
      for (let j = i; j < input.length; j++) out.push(input[j]);
      return Uint8Array.from(out);
    }
    // 長さを持たないマーカー
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(0xff, marker);
      i += 2;
      continue;
    }
    if (marker === 0xd9) {
      out.push(0xff, 0xd9);
      return Uint8Array.from(out);
    }
    if (i + 3 >= input.length) throw new Error("JPEG の形が壊れています");
    const length = (input[i + 2] << 8) | input[i + 3];
    if (length < 2 || i + 2 + length > input.length) throw new Error("JPEG の形が壊れています");

    const isAppN = marker >= 0xe1 && marker <= 0xef; // APP1〜APP15
    const isComment = marker === 0xfe;
    if (!isAppN && !isComment) {
      for (let j = i; j < i + 2 + length; j++) out.push(input[j]);
    }
    i += 2 + length;
  }
  throw new Error("JPEG の形が壊れています");
}
