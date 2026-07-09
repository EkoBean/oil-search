import * as cheerio from "cheerio";

export async function findPdfLink(pageUrl, titleKeyword) {
  const res = await fetch(pageUrl);
  if (!res.ok) {
    throw new Error(`抓取 ${pageUrl} 失敗: ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  let found = null;
  
  $(".listTable a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (href.toLowerCase() && text.includes(titleKeyword)) {
      found = new URL(href, pageUrl).toString();
    }
  });

  if (!found) {
    throw new Error(`在 ${pageUrl} 找不到符合關鍵字「${titleKeyword}」的 PDF 連結`);
  }
  return found;
}
