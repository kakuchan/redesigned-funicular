/** 拾った人が選ぶ「どこにありますか」 */
export const ITEM_LOCATIONS = {
  holding: "今、手元に持っています",
  handed_in: "お店・駅・交番などに届けました",
  left_there: "見つけた場所に置いたままです",
} as const;

export type ItemLocation = keyof typeof ITEM_LOCATIONS;

export function isItemLocation(value: unknown): value is ItemLocation {
  return typeof value === "string" && Object.hasOwn(ITEM_LOCATIONS, value);
}

export const MESSAGE_MAX = 1000;

/** 位置情報の入力を確かめる。両方そろっていて範囲内のときだけ使う。 */
export function parseLatLng(
  lat: unknown,
  lng: unknown,
): { latitude: number; longitude: number } | null {
  if (lat === null || lat === undefined || lat === "" || lng === null || lng === undefined || lng === "") {
    return null;
  }
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  // 小数 5 桁（約 1m）に丸める
  return {
    latitude: Math.round(latitude * 1e5) / 1e5,
    longitude: Math.round(longitude * 1e5) / 1e5,
  };
}

export function mapUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
}
