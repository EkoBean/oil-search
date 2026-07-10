import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { prisma } from "../lib/prisma.js";
import { OUTPUT_ROOT } from "../lib/paths.js";

async function readCsv(fileName) {
  const raw = await readFile(path.join(OUTPUT_ROOT, fileName), "utf-8");
  return parse(raw, { columns: true, skip_empty_lines: true, bom: true });
}

// 每次重新解析都是「這個 docType 目前待審核的最新一份」，先清掉舊的 staging 列，
// 避免同一份 CSV 重跑（或同一 docType 再次上傳新 PDF）時，舊資料跟新資料疊在一起。
export async function loadDownstreamVendorsStaging(sourceDocId) {
  const rows = await readCsv("下游業者清單.csv");
  await prisma.$transaction([
    prisma.stagingDownstreamVendor.deleteMany(),
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
