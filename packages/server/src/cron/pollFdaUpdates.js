import { findPdfLink } from "../ingest/findPdfLink.js";
import { downloadAndCheck } from "../ingest/downloadAndCheck.js";
import { runExtractPdfs } from "../ingest/runExtractPdfs.js";
import { loadDownstreamVendorsStaging, loadRecallProductsStaging } from "../ingest/loadStagingFromCsv.js";
import { notifyAdmin } from "../notify/discord.js";
import { prisma } from "../lib/prisma.js";

const DOWNSTREAM_AND_OILS_PAGE = process.env.FDA_DOWNSTREAM_AND_OILS_URL;
const RECALL_LIST_PAGE = process.env.FDA_RECALL_LIST_URL;

async function markStatus(sourceDocId, status, errorMessage = null) {
  await prisma.sourceDocument.update({
    where: { id: sourceDocId },
    data: { status, processedAt: new Date(), errorMessage },
  });
}

export async function pollFdaUpdates() {
  console.log("[cron] 開始檢查 FDA 來源是否有更新...");

  let downstreamUpdated = false;
  let recallUpdated = false;

  // 1. 下游業者清單（自動解析，仍需人工補備註）
  try {
    const pdfUrl = await findPdfLink(DOWNSTREAM_AND_OILS_PAGE, "下游業者");
    const { isNew, sourceDoc } = await downloadAndCheck("downstream_vendors", DOWNSTREAM_AND_OILS_PAGE, pdfUrl);
    if (isNew) {
      downstreamUpdated = true;
      await pendingExtraction(sourceDoc.id, loadDownstreamVendorsStaging, "下游業者清單");
    }
  } catch (err) {
    console.error("[cron] 下游業者清單檢查失敗:", err);
    await notifyAdmin(`⚠️ 下游業者清單檢查失敗: ${err.message}`);
  }

  // 2. 受影響油品資訊（圖配文 PDF，純人工輸入，這裡只偵測新版本並通知）
  try {
    const pdfUrl = await findPdfLink(DOWNSTREAM_AND_OILS_PAGE, "受影響油品");
    const { isNew, sourceDoc } = await downloadAndCheck("affected_oils", DOWNSTREAM_AND_OILS_PAGE, pdfUrl);
    if (isNew) {
      await notifyAdmin(`📄 受影響油品資訊有新公告版本，請至後台手動輸入資料（sourceDocId=${sourceDoc.id}）`);
    }
  } catch (err) {
    console.error("[cron] 受影響油品資訊檢查失敗:", err);
    await notifyAdmin(`⚠️ 受影響油品資訊檢查失敗: ${err.message}`);
  }

  // 3. 預防性下架產品清單（自動解析）
  try {
    const pdfUrl = await findPdfLink(RECALL_LIST_PAGE, "預防性下架");
    const { isNew, sourceDoc } = await downloadAndCheck("recall_products", RECALL_LIST_PAGE, pdfUrl);
    if (isNew) {
      recallUpdated = true;
      await pendingExtraction(sourceDoc.id, loadRecallProductsStaging, "預防性下架產品清單");
    }
  } catch (err) {
    console.error("[cron] 預防性下架清單檢查失敗:", err);
    await notifyAdmin(`⚠️ 預防性下架清單檢查失敗: ${err.message}`);
  }

  // extract_pdfs.py 一次會重算兩份 CSV，兩邊各自 new 的話避免重跑兩次
  if (downstreamUpdated || recallUpdated) {
    console.log("[cron] 偵測到更新，已於各自流程內完成 extract + staging 匯入");
  } else {
    console.log("[cron] 沒有偵測到更新");
  }
}

async function pendingExtraction(sourceDocId, loadStagingFn, label) {
  try {
    await runExtractPdfs();
    const count = await loadStagingFn(sourceDocId);
    await markStatus(sourceDocId, "pending_review");
    await notifyAdmin(`✅ ${label} 偵測到更新，已解析 ${count} 筆資料到 staging，請至後台審核`);
  } catch (err) {
    await markStatus(sourceDocId, "failed", err.message);
    await notifyAdmin(`⚠️ ${label} 解析失敗: ${err.message}`);
    throw err;
  }
}
