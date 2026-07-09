import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../lib/hash.js";
import { prisma } from "../lib/prisma.js";

const ARCHIVE_ROOT = path.resolve(process.env.REPO_ROOT ?? "../..", "source data", "_archive");

/**
 * 下載 PDF、算 hash、跟該 docType 上一筆 SourceDocument 比對。
 * 回傳 { isNew, sourceDoc } — isNew 為 false 代表跟上次完全一樣，不用往下處理。
 */
export async function downloadAndCheck(docType, sourceUrl, pdfUrl) {
  const res = await fetch(pdfUrl);
  if (!res.ok) {
    throw new Error(`下載 ${pdfUrl} 失敗: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const hash = sha256(buffer);

  const lastDoc = await prisma.sourceDocument.findFirst({
    where: { docType },
    orderBy: { fetchedAt: "desc" },
  });

  if (lastDoc && lastDoc.sha256 === hash) {
    return { isNew: false, sourceDoc: lastDoc };
  }

  await mkdir(ARCHIVE_ROOT, { recursive: true });
  const fileName = `${docType}_${Date.now()}_${hash.slice(0, 8)}.pdf`;
  const filePath = path.join(ARCHIVE_ROOT, fileName);
  await writeFile(filePath, buffer);

  const sourceDoc = await prisma.sourceDocument.create({
    data: {
      docType,
      sourceUrl,
      filePath,
      sha256: hash,
      status: "new",
    },
  });

  return { isNew: true, sourceDoc };
}
