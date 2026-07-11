import { Router } from "express";
import * as cheerio from "cheerio";
import { prisma } from "../../lib/prisma.js";
import { listFlowChartPics } from "../../images/flowChartPics.js";

export const publicRouter = Router();

// 三個查詢頁各自對應一支整包資料的端點，前端 fetch 一次後在瀏覽器端做篩選。
// 之後要優化成靜態 JSON（發布時 dump 檔案）可以直接替換這幾支 handler，
// 前端呼叫的路徑不用改。

publicRouter.get("/downstream-vendors", async (_req, res) => {
  const rows = await prisma.downstreamVendor.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

publicRouter.get("/recall-products", async (_req, res) => {
  const rows = await prisma.recallProduct.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

publicRouter.get("/affected-oils", async (_req, res) => {
  const rows = await prisma.affectedOil.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

// 回收統計（流向圖黃框數字）：每個事件一列，人工輸入
publicRouter.get("/recall-stats", async (_req, res) => {
  const rows = await prisma.recallStat.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

// 下游流向圖：目前版本的逐頁圖網址 + 最近一次更新資訊
publicRouter.get("/flow-chart", async (_req, res) => {
  const latest = await prisma.flowChartUpdate.findFirst({ orderBy: { id: "desc" } });
  res.json({
    updatedAt: latest?.publishedAt ?? null,
    pages: await listFlowChartPics(),
  });
});

// ---------- 食藥署新聞（爬專區「最新消息」列表頁） ----------
const FDA_NEWS_LIST_URL = "https://www.fda.gov.tw/TC/siteList.aspx?sid=13712";
const NEWS_TTL_MS = 60 * 60 * 1000;
let newsCache = { fetchedAt: 0, items: [] };

// FDA 的日期格式不固定（2026/07/10、2026-7-4 都出現過），補零統一成 YYYY/MM/DD 才能排序
function normalizeNewsDate(raw) {
  const [y, m, d] = String(raw ?? "").split(/[/-]/);
  if (!y || !m || !d) return String(raw ?? "");
  return `${y}/${m.padStart(2, "0")}/${d.padStart(2, "0")}`;
}

async function fetchNewsItems() {
  const resp = await fetch(FDA_NEWS_LIST_URL, { signal: AbortSignal.timeout(10_000) });
  if (!resp.ok) throw new Error(`FDA 專區列表 HTTP ${resp.status}`);
  const $ = cheerio.load(await resp.text());

  // 清單是 .listTable 表格（跟 findPdfLink.js 爬的頁面同一套版型），
  // 每列：序號｜標題（連到 newsContent.aspx）｜發布日期（最後一格）
  const items = [];
  $(".listTable tr").each((_, tr) => {
    const $a = $(tr).find('a[href*="newsContent.aspx"]').first();
    if (!$a.length) return; // 表頭列或非新聞列
    const href = $a.attr("href");
    items.push({
      title: $a.text().trim(),
      url: new URL(href, "https://www.fda.gov.tw/TC/").href.replace(/^http:/, "https:"),
      date: normalizeNewsDate($(tr).find("td").last().text().trim()),
    });
  });

  // 一列都解析不到通常代表 FDA 改版了，當成失敗讓快取撐著，不要回空陣列蓋掉舊資料
  if (items.length === 0) throw new Error("FDA 專區列表解析不到任何新聞列，頁面結構可能改了");
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

publicRouter.get("/news", async (_req, res) => {
  if (Date.now() - newsCache.fetchedAt > NEWS_TTL_MS) {
    try {
      newsCache = { fetchedAt: Date.now(), items: await fetchNewsItems() };
    } catch (err) {
      // 抓失敗沿用舊快取，但照樣重算 TTL，別讓每個請求都去打 FDA
      console.warn("[public/news] FDA 專區列表抓取失敗，沿用快取:", err.message);
      newsCache.fetchedAt = Date.now();
    }
  }
  res.json(newsCache.items);
});
