import { describe, expect, it } from "vitest";
import { isItemLocation, mapUrl, parseLatLng } from "./labels";

describe("isItemLocation", () => {
  it("決めた値だけ", () => {
    expect(isItemLocation("holding")).toBe(true);
    expect(isItemLocation("toString")).toBe(false);
    expect(isItemLocation("")).toBe(false);
    expect(isItemLocation(undefined)).toBe(false);
  });
});

describe("parseLatLng", () => {
  it("両方そろえば丸めて返す", () => {
    expect(parseLatLng("35.6812345", "139.7671234")).toEqual({
      latitude: 35.68123,
      longitude: 139.76712,
    });
  });
  it.each([
    ["", ""],
    ["35", ""],
    ["abc", "139"],
    ["91", "0"],
    ["0", "181"],
    [undefined, undefined],
  ])("おかしな値は使わない（%s, %s）", (lat, lng) => {
    expect(parseLatLng(lat, lng)).toBeNull();
  });
});

describe("mapUrl", () => {
  it("OpenStreetMap のリンク", () => {
    expect(mapUrl(35.1, 139.2)).toBe(
      "https://www.openstreetmap.org/?mlat=35.1&mlon=139.2#map=18/35.1/139.2",
    );
  });
});
