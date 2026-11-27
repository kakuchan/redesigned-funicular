/**
 * ブラウザで写真を縮小し、JPEG に描き直す。描き直すことで EXIF（位置情報など）も消える。
 * iPhone の HEIC などもブラウザが読めれば JPEG になる。
 */
export const MAX_EDGE = 1600;

export async function resizeToJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas が使えません");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("写真を変換できませんでした");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
