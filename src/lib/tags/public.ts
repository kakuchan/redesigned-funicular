import { isTagId } from "./id";

/**
 * 拾った人用に、タグの状態を読む。
 *
 * DB の get_tag_public() は未登録・停止中のとき名前などを null で返すが、
 * 生成された型では null にならない扱いになっている（D-006）。ここで正しい型に直す。
 */
export type PublicTag =
  | { status: "not_found" }
  | { status: "unregistered" }
  | { status: "suspended" }
  | {
      status: "active";
      itemName: string;
      publicMessage: string;
      lostMode: boolean;
    };

type RpcRow = {
  status: string | null;
  item_name: string | null;
  public_message: string | null;
  lost_mode: boolean | null;
};

/** get_tag_public を呼ぶ関数。テストでは差し替える。 */
export type GetTagPublicRpc = (
  tagId: string,
) => Promise<{ data: RpcRow[] | null; error: { message: string } | null }>;

export async function readPublicTag(
  tagId: string,
  rpc: GetTagPublicRpc,
): Promise<PublicTag> {
  // 形式が違うものは DB に問い合わせない
  if (!isTagId(tagId)) return { status: "not_found" };

  const { data, error } = await rpc(tagId);
  if (error) throw new Error(`タグの読み込みに失敗しました: ${error.message}`);

  const row = data?.[0];
  if (!row) return { status: "not_found" };

  switch (row.status) {
    case "unregistered":
      return { status: "unregistered" };
    case "suspended":
      return { status: "suspended" };
    case "active":
      // 持ち物がない「有効」はデータの不整合。拾った人には未登録と同じに見せない。
      if (row.item_name === null) return { status: "suspended" };
      return {
        status: "active",
        itemName: row.item_name,
        publicMessage: row.public_message ?? "",
        lostMode: row.lost_mode ?? false,
      };
    default:
      return { status: "not_found" };
  }
}
