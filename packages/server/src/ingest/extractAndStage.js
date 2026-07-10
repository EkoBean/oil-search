import { runExtractPdfs } from "./runExtractPdfs.js";
import { loadDownstreamVendorsStaging, loadRecallProductsStaging } from "./loadStagingFromCsv.js";
// import { notifyAdmin } from "../notify/discord.js";
import { prisma } from "../lib/prisma.js";

const STAGING_LOADERS = {
  downstream_vendors: { load: loadDownstreamVendorsStaging, label: "下游業者清單" },
  recall_products: { load: loadRecallProductsStaging, label: "預防性下架產品清單" },
};

export async function markStatus(sourceDocId, status, errorMessage = null) {
  await prisma.sourceDocument.update({
    where: { id: sourceDocId },
    data: { status, processedAt: new Date(), errorMessage },
  });
}

/**
 * 跑 extract_pdfs.py 並把結果寫進對應的 staging table。
 * 不論 sourceDoc 是每小時輪詢下載的，還是後台手動上傳的，走到這一步都是同一套邏輯。
 */
export async function extractAndStage(sourceDoc) {
  const config = STAGING_LOADERS[sourceDoc.docType];
  if (!config) {
    throw new Error(
      `docType「${sourceDoc.docType}」沒有對應的 staging 流程（受影響油品資訊是純人工輸入，不會走到這裡）`
    );
  }

  try {
    await runExtractPdfs({ docType: sourceDoc.docType, inputPath: sourceDoc.filePath });
    const count = await config.load(sourceDoc.id);
    await markStatus(sourceDoc.id, "pending_review");
    // await notifyAdmin(`Extraction Success ${config.label} 已解析 ${count} 筆資料到 staging，請至後台審核`);
    return count;
  } catch (err) {
    await markStatus(sourceDoc.id, "failed", err.message);
    // await notifyAdmin(`Extraction Failed ${config.label} Error mesasge: ${err.message}`);
    throw err;
  }
}
