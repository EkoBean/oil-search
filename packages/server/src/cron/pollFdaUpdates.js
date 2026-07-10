// import { checkForNewVersion } from "../ingest/checkForNewVersion.js";
// import { downloadPdf } from "../ingest/downloadPdf.js";
// import { extractAndStage, markStatus } from "../ingest/extractAndStage.js";
// import { notifyAdmin } from "../notify/discord.js";

// const DOWNSTREAM_AND_OILS_PAGE = process.env.FDA_DOWNSTREAM_AND_OILS_URL;
// const RECALL_LIST_PAGE = process.env.FDA_RECALL_LIST_URL;

// /**
//  * 每小時只做「抓列表頁 HTML + 比對下載連結的 fileId」這種輕量檢查，
//  * 只有連結真的變了才會實際下載 PDF、跑 extract_pdfs.py、寫入 staging。
//  */
// export async function pollFdaUpdates() {
//   console.log("[cron] 開始檢查 FDA 來源連結是否有更新...");

//   let downstreamChanged = false;
//   let recallChanged = false;

//   // 1. 下游業者清單（自動解析，仍需人工補備註）
//   try {
//     const { changed, downloadUrl, fileId } = await checkForNewVersion(
//       "downstream_vendors",
//       DOWNSTREAM_AND_OILS_PAGE,
//       "下游業者"
//     );
//     if (changed) {
//       downstreamChanged = true;
//       const sourceDoc = await downloadPdf({
//         docType: "downstream_vendors",
//         sourceUrl: DOWNSTREAM_AND_OILS_PAGE,
//         downloadUrl,
//         fileId,
//       });
//       await extractAndStage(sourceDoc);
//     }
//   } catch (err) {
//     console.error("[cron] 下游業者清單檢查失敗:", err);
//     await notifyAdmin(`⚠️ 下游業者清單檢查失敗: ${err.message}`);
//   }

//   // 2. 受影響油品資訊（圖配文 PDF，純人工輸入，這裡只偵測連結變化並通知）
//   try {
//     const { changed, downloadUrl, fileId } = await checkForNewVersion(
//       "affected_oils",
//       DOWNSTREAM_AND_OILS_PAGE,
//       "受影響油品"
//     );
//     if (changed) {
//       const sourceDoc = await downloadPdf({
//         docType: "affected_oils",
//         sourceUrl: DOWNSTREAM_AND_OILS_PAGE,
//         downloadUrl,
//         fileId,
//       });
//       await markStatus(sourceDoc.id, "pending_review");
//       await notifyAdmin(`📄 受影響油品資訊有新公告版本，請至後台手動輸入資料（sourceDocId=${sourceDoc.id}）`);
//     }
//   } catch (err) {
//     console.error("[cron] 受影響油品資訊檢查失敗:", err);
//     await notifyAdmin(`⚠️ 受影響油品資訊檢查失敗: ${err.message}`);
//   }

//   // 3. 預防性下架產品清單（自動解析）
//   try {
//     const { changed, downloadUrl, fileId } = await checkForNewVersion(
//       "recall_products",
//       RECALL_LIST_PAGE,
//       "預防性下架"
//     );
//     if (changed) {
//       recallChanged = true;
//       const sourceDoc = await downloadPdf({
//         docType: "recall_products",
//         sourceUrl: RECALL_LIST_PAGE,
//         downloadUrl,
//         fileId,
//       });
//       await extractAndStage(sourceDoc);
//     }
//   } catch (err) {
//     console.error("[cron] 預防性下架清單檢查失敗:", err);
//     await notifyAdmin(`⚠️ 預防性下架清單檢查失敗: ${err.message}`);
//   }

//   if (!downstreamChanged && !recallChanged) {
//     console.log("[cron] 連結都沒有變化，沒有下載任何 PDF");
//   }
// }
