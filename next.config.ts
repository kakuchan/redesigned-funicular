import type { NextConfig } from "next";

// タグのページは検索エンジンに載せず、外部サイトへ URL（タグ ID）を送らない
const tagPageHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/t/:path*", headers: tagPageHeaders },
      { source: "/register/:path*", headers: tagPageHeaders },
      { source: "/items/:path*", headers: tagPageHeaders },
      { source: "/login/:path*", headers: tagPageHeaders },
      { source: "/conversations/:path*", headers: tagPageHeaders },
      { source: "/c/:path*", headers: tagPageHeaders },
    ];
  },
};

export default nextConfig;
