import { findPdfLink } from "./findPdfLink.js";
import { extractFileId } from "./extractFileId.js";
import { prisma } from "../lib/prisma.js";

/**
 * 每小時真正會做的事：只抓 HTML 列表頁、解析出下載連結的 fileId，
 * 跟資料庫裡該 docType 最後一次記錄的 fileId 比對。完全不下載 PDF。
 */
export async function checkForNewVersion(docType, pageUrl, titleKeyword) {
  const downloadUrl = await findPdfLink(pageUrl, titleKeyword);
  const fileId = extractFileId(downloadUrl);

  const lastDoc = await prisma.sourceDocument.findFirst({
    where: { docType },
    orderBy: { checkedAt: "desc" },
  });

  return {
    changed: !lastDoc || lastDoc.fileId !== fileId,
    downloadUrl,
    fileId,
  };
}
