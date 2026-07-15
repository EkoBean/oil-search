import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma.js";
import { ARCHIVE_ROOT } from "../lib/paths.js";
import { extractAndStage } from "./extractAndStage.js";

const SUPPORTED_DOC_TYPES = new Set([
  "downstream_vendors",
  "recall_products",
  "fushou_downstream",
  "fumao_downstream",
  "taishan_downstream",
]);

/**
 * 手動上傳流程的入口：admin 上傳 PDF + 選 docType，存檔、建立 SourceDocument，
 * 然後跟 pollFdaUpdates 共用同一套 extractAndStage 去跑 extract_pdfs.py、寫入 staging。
 * 差別只在 PDF 從哪裡來——這裡沒有 FDA 來源網址，所以 sourceUrl/downloadUrl 用
 * 固定字串標記，fileId 用上傳時間戳記（不像輪詢有 GetFile.ashx?id= 可比對版本）。
 */
export async function uploadManualPdf({ docType, buffer, originalName }) {
  if (!SUPPORTED_DOC_TYPES.has(docType)) {
    throw new Error(
      `不支援的 docType「${docType}」（受影響油品資訊請直接用後台表單輸入，不需上傳 PDF）`
    );
  }

  await mkdir(ARCHIVE_ROOT, { recursive: true });
  const fileId = `manual-${Date.now()}`;
  const fileName = `${docType}_${fileId}.pdf`;
  const filePath = path.join(ARCHIVE_ROOT, fileName);
  await writeFile(filePath, buffer);

  const sourceDoc = await prisma.sourceDocument.create({
    data: {
      docType,
      sourceUrl: `manual-upload:${originalName}`,
      downloadUrl: "manual-upload",
      fileId,
      filePath,
      status: "new",
      downloadedAt: new Date(),
    },
  });

  await extractAndStage(sourceDoc);

  // extractAndStage 內部另外 update 了這筆記錄的 status/processedAt，
  // 重新查一次才能回傳最新狀態給呼叫端，而不是 create() 當下那份已經過期的資料。
  return prisma.sourceDocument.findUniqueOrThrow({ where: { id: sourceDoc.id } });
}
