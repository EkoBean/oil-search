import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { prisma } from "../lib/prisma.js";

const REPO_ROOT = path.resolve(process.env.REPO_ROOT ?? "../..");
const OUT_DIR = path.join(REPO_ROOT, "output");

async function readCsv(fileName) {
  const raw = await readFile(path.join(OUT_DIR, fileName), "utf-8");
  return parse(raw, { columns: true, skip_empty_lines: true, bom: true });
}

export async function loadDownstreamVendorsStaging(sourceDocId) {
  const rows = await readCsv("下游業者清單.csv");
  await prisma.stagingDownstreamVendor.createMany({
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
  });
  return rows.length;
}

export async function loadRecallProductsStaging(sourceDocId) {
  const rows = await readCsv("預防性下架產品清單.csv");
  await prisma.stagingRecallProduct.createMany({
    data: rows.map((r) => ({
      sourceDocId,
      vendorSeq: r["業者序號"],
      county: r["縣市"],
      vendor: r["業者"],
      productSeq: r["產品序號"],
      productName: r["產品名稱"],
      expiryDate: r["有效日期"],
    })),
  });
  return rows.length;
}
