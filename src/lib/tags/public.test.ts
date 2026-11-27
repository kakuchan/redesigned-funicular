import { describe, expect, it, vi } from "vitest";
import { generateTagId } from "./id";
import { readPublicTag, type GetTagPublicRpc } from "./public";

const id = generateTagId();

function rpcReturning(
  rows: Record<string, unknown>[],
  error: { message: string } | null = null,
) {
  return vi.fn<GetTagPublicRpc>(async () => ({ data: rows as never, error }));
}

describe("readPublicTag", () => {
  it("形式が違う ID は DB に問い合わせずに not_found", async () => {
    const rpc = rpcReturning([]);
    for (const bad of ["", "short", "../../etc/passwd", "a".repeat(200), "O".repeat(16)]) {
      expect(await readPublicTag(bad, rpc)).toEqual({ status: "not_found" });
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("行がなければ not_found", async () => {
    expect(await readPublicTag(id, rpcReturning([]))).toEqual({ status: "not_found" });
  });

  it("未登録", async () => {
    const rpc = rpcReturning([
      { status: "unregistered", item_name: null, public_message: null, lost_mode: null },
    ]);
    expect(await readPublicTag(id, rpc)).toEqual({ status: "unregistered" });
    expect(rpc).toHaveBeenCalledWith(id);
  });

  it("停止中は持ち物の情報を出さない", async () => {
    const rpc = rpcReturning([
      { status: "suspended", item_name: "漏れてはいけない", public_message: "x", lost_mode: true },
    ]);
    expect(await readPublicTag(id, rpc)).toEqual({ status: "suspended" });
  });

  it("有効なら名前・一言・紛失モードだけを返す", async () => {
    const rpc = rpcReturning([
      {
        status: "active",
        item_name: "青い水筒",
        public_message: "連絡お願いします",
        lost_mode: true,
        // DB が余計な列を返しても外に出さない
        owner_email: "owner@example.test",
      },
    ]);
    const result = await readPublicTag(id, rpc);
    expect(result).toEqual({
      status: "active",
      itemName: "青い水筒",
      publicMessage: "連絡お願いします",
      lostMode: true,
    });
    expect(JSON.stringify(result)).not.toContain("owner");
  });

  it("持ち物のない「有効」は停止扱い", async () => {
    const rpc = rpcReturning([
      { status: "active", item_name: null, public_message: null, lost_mode: null },
    ]);
    expect(await readPublicTag(id, rpc)).toEqual({ status: "suspended" });
  });

  it("DB のエラーはそのまま失敗にする（未登録などと取り違えない）", async () => {
    const rpc = rpcReturning([], { message: "boom" });
    await expect(readPublicTag(id, rpc)).rejects.toThrow("タグの読み込みに失敗しました");
  });
});
