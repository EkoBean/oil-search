import "dotenv/config";
import { findPdfLink } from "../src/ingest/findPdfLink.js";

const targets = [
  {
    pageUrl: process.env.FDA_DOWNSTREAM_AND_OILS_URL,
    titleKeyword: "下游業者",
  },
  {
    pageUrl: process.env.FDA_DOWNSTREAM_AND_OILS_URL,
    titleKeyword: "受影響油品",
  },
  {
    pageUrl: process.env.FDA_RECALL_LIST_URL,
    titleKeyword: "預防性下架",
  },
];

async function inspectPage(pageUrl) {
  const res = await fetch(pageUrl);
  const html = await res.text();
  return { status: res.status, length: html.length, snippet: html.slice(0, 200) };
}

async function main() {
  const pageCache = new Map();

  for (const { pageUrl, titleKeyword } of targets) {
    console.log(`\n=== pageUrl=${pageUrl}  titleKeyword="${titleKeyword}" ===`);

    if (!pageUrl) {
      console.log("❌ 環境變數沒有設定這個網址，請檢查 .env");
      continue;
    }

    if (!pageCache.has(pageUrl)) {
      try {
        pageCache.set(pageUrl, await inspectPage(pageUrl));
      } catch (err) {
        pageCache.set(pageUrl, { error: err.message });
      }
    }
    const pageInfo = pageCache.get(pageUrl);
    if (pageInfo.error) {
      console.log(`❌ 抓取頁面本身就失敗: ${pageInfo.error}`);
      continue;
    }
    console.log(`頁面 HTTP status: ${pageInfo.status}, HTML 長度: ${pageInfo.length}`);
    console.log(`HTML 開頭片段: ${pageInfo.snippet.replace(/\s+/g, " ")}`);

    try {
      const downloadUrl = await findPdfLink(pageUrl, titleKeyword);
      console.log(`✅ 找到 PDF 連結: ${downloadUrl}`);
    } catch (err) {
      console.log(`❌ findPdfLink 失敗: ${err.message}`);
    }
  }
}

main();
