import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { prisma } from "../lib/prisma.js";
import { OUTPUT_ROOT } from "../lib/paths.js";

async function readCsv(fileName) {
  const raw = await readFile(path.join(OUTPUT_ROOT, fileName), "utf-8");
  return parse(raw, { columns: true, skip_empty_lines: true, bom: true });
}

// downstream_vendors 及三家廠商自行揭露的清單 (fushou/fumao/taishan_downstream) 欄位相同，
// 共用同一張 StagingDownstreamVendor 表跟後台審核/發布流程；只是各自的 CSV 檔名不同。
const DOWNSTREAM_LIKE_CSV_FILENAMES = {
  downstream_vendors: "下游業者清單.csv",
  fushou_downstream: "福壽自行揭露下游業者清單.csv",
  fumao_downstream: "福懋自行揭露下游業者清單.csv",
  taishan_downstream: "泰山自行揭露下游業者清單.csv",
};

// 每次重新解析都是「這個來源目前待審核的最新一份」，先清掉同一 docType 的舊 staging 列
// (只清同一來源，不動其他來源的 staging 資料——四種來源共用同一張表，各自審核、各自發布)，
// 避免同一 docType 的 CSV 重跑（或再次上傳新 PDF）時，舊資料跟新資料疊在一起。
export async function loadDownstreamVendorsStaging(sourceDocId, docType = "downstream_vendors") {
  const fileName = DOWNSTREAM_LIKE_CSV_FILENAMES[docType];
  const rows = await readCsv(fileName);
  const priorSourceDocIds = await prisma.sourceDocument.findMany({
    where: { docType },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.stagingDownstreamVendor.deleteMany({
      where: { sourceDocId: { in: priorSourceDocIds.map((d) => d.id) } },
    }),
    prisma.stagingDownstreamVendor.createMany({
      data: rows.map((r) => ({
        sourceDocId,
        seq: r["序號"],
        county: r["縣市"],
        vendor: r["業者"],
        item: r["品項"],
        lotNumber: r["批號"],
        expiryDate: r["有效日期"],
        note: r["備註"] || null,
      })),
    }),
  ]);
  return rows.length;
}

export async function loadRecallProductsStaging(sourceDocId) {
  const rows = await readCsv("預防性下架產品清單.csv");
  await prisma.$transaction([
    prisma.stagingRecallProduct.deleteMany(),
    prisma.stagingRecallProduct.createMany({
      data: rows.map((r) => ({
        sourceDocId,
        vendorSeq: r["業者序號"],
        county: r["縣市"],
        vendor: r["業者"],
        productSeq: r["產品序號"],
        productName: r["產品名稱"],
        expiryDate: r["有效日期"],
      })),
    }),
  ]);
  return rows.length;
}
