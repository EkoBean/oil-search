import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma.js";
import { ARCHIVE_ROOT } from "../lib/paths.js";

/**
 * 只有在 checkForNewVersion 判斷連結真的變了之後才會呼叫這支。
 * 下載 PDF、存檔，並新增一筆 SourceDocument。
 */
export async function downloadPdf({ docType, sourceUrl, downloadUrl, fileId }) {
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`下載 ${downloadUrl} 失敗: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  await mkdir(ARCHIVE_ROOT, { recursive: true });
  const fileName = `${docType}_${fileId}.pdf`;
  const filePath = path.join(ARCHIVE_ROOT, fileName);
  await writeFile(filePath, buffer);

  return prisma.sourceDocument.create({
    data: {
      docType,
      sourceUrl,
      downloadUrl,
      fileId,
      filePath,
      status: "new",
      downloadedAt: new Date(),
    },
  });
}
