import * as cheerio from "cheerio";

/**
 * 從 FDA 公告頁面 HTML 找出符合關鍵字的 PDF 連結。
 *
 * TODO: 目前用「連結文字包含關鍵字 + href 以 .pdf 結尾」這種通用邏輯猜測，
 * 還沒有對照過 siteList.aspx / site.aspx 實際渲染出來的 DOM 結構，
 * 正式串接前務必先手動 fetch 一次頁面、用瀏覽器 devtools 確認連結的
 * class/結構穩不穩定，再調整這裡的 selector。
 */
export async function findPdfLink(pageUrl, titleKeyword) {
  const res = await fetch(pageUrl);
  if (!res.ok) {
    throw new Error(`抓取 ${pageUrl} 失敗: ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  let found = null;
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (href.toLowerCase().endsWith(".pdf") && text.includes(titleKeyword)) {
      found = new URL(href, pageUrl).toString();
    }
  });

  if (!found) {
    throw new Error(`在 ${pageUrl} 找不到符合關鍵字「${titleKeyword}」的 PDF 連結`);
  }
  return found;
}
