import { describe, expect, it } from "vitest";
import { isJpeg, stripJpegMetadata } from "./jpeg";

function segment(marker: number, payload: number[]) {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
}
const ascii = (s: string) => [...Buffer.from(s, "latin1")];

// 最小限の JPEG 風データ（構造の確認用）
function fakeJpeg(extra: number[][]) {
  return Uint8Array.from([
    0xff, 0xd8,
    ...segment(0xe0, ascii("JFIF\0")),
    ...extra.flat(),
    ...segment(0xdb, [0, 1, 2, 3]),
    ...segment(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]),
    ...segment(0xda, [1, 1, 0, 0, 0x3f, 0]),
    0x12, 0x34, 0xff, 0x00, 0x56,
    0xff, 0xd9,
  ]);
}

describe("stripJpegMetadata", () => {
  it("EXIF（位置情報）・XMP・コメントを取り除き、画像データは残す", () => {
    const gps = ascii("Exif\0\0GPSLatitude=35.68,GPSLongitude=139.76,Model=iPhone");
    const input = fakeJpeg([
      segment(0xe1, gps),
      segment(0xe1, ascii("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>")),
      segment(0xed, ascii("Photoshop 3.0")),
      segment(0xfe, ascii("secret comment")),
    ]);
    const out = stripJpegMetadata(input);
    const text = Buffer.from(out).toString("latin1");
    expect(isJpeg(out)).toBe(true);
    expect(text).not.toContain("GPS");
    expect(text).not.toContain("iPhone");
    expect(text).not.toContain("xmpmeta");
    expect(text).not.toContain("secret comment");
    expect(text).toContain("JFIF");
    // SOS 以降（画像データ）はそのまま
    expect([...out.slice(-7)]).toEqual([0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd9]);
    expect(out.length).toBeLessThan(input.length);
  });

  it("メタデータがなければ同じ内容", () => {
    const input = fakeJpeg([]);
    expect([...stripJpegMetadata(input)]).toEqual([...input]);
  });

  it("JPEG でないもの・壊れたものは失敗する", () => {
    expect(() => stripJpegMetadata(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0]))).toThrow();
    expect(() => stripJpegMetadata(Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff]))).toThrow();
    expect(() => stripJpegMetadata(Uint8Array.from([0xff, 0xd8, 0x00, 0x00, 0x00]))).toThrow();
  });
});
