import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

export const adminRouter = Router();

// TODO: 這一整個 router 目前沒有任何登入驗證，正式上線前一定要加
// session/JWT 之類的機制，並且套用在 index.js mount 這個 router 的地方。

// ---------- 下游業者清單 ----------

adminRouter.get("/staging/downstream-vendors", async (_req, res) => {
  const rows = await prisma.stagingDownstreamVendor.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

adminRouter.patch("/staging/downstream-vendors/:id", async (req, res) => {
  const row = await prisma.stagingDownstreamVendor.update({
    where: { id: Number(req.params.id) },
    data: { reviewedNote: req.body.reviewedNote },
  });
  res.json(row);
});

adminRouter.post("/publish/downstream-vendors", async (_req, res) => {
  const staged = await prisma.stagingDownstreamVendor.findMany();
  await prisma.$transaction([
    prisma.downstreamVendor.deleteMany(),
    prisma.downstreamVendor.createMany({
      data: staged.map((r) => ({
        seq: r.seq,
        county: r.county,
        vendor: r.vendor,
        item: r.item,
        lotNumber: r.lotNumber,
        expiryDate: r.expiryDate,
        note: r.reviewedNote ?? r.note,
      })),
    }),
  ]);
  res.json({ published: staged.length });
});

// ---------- 預防性下架產品清單 ----------

adminRouter.get("/staging/recall-products", async (_req, res) => {
  const rows = await prisma.stagingRecallProduct.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

adminRouter.post("/publish/recall-products", async (_req, res) => {
  const staged = await prisma.stagingRecallProduct.findMany();
  await prisma.$transaction([
    prisma.recallProduct.deleteMany(),
    prisma.recallProduct.createMany({
      data: staged.map((r) => ({
        vendorSeq: r.vendorSeq,
        county: r.county,
        vendor: r.vendor,
        productSeq: r.productSeq,
        productName: r.productName,
        expiryDate: r.expiryDate,
      })),
    }),
  ]);
  res.json({ published: staged.length });
});

// ---------- 受影響油品資訊（純人工輸入）----------

adminRouter.get("/staging/affected-oils", async (_req, res) => {
  const rows = await prisma.stagingAffectedOil.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

adminRouter.post("/staging/affected-oils", async (req, res) => {
  const { sourceDocId, brand, productName, lotNumber, expiryDate, note, enteredBy } = req.body;
  const row = await prisma.stagingAffectedOil.create({
    data: { sourceDocId, brand, productName, lotNumber, expiryDate, note, enteredBy },
  });
  res.status(201).json(row);
});

adminRouter.post("/publish/affected-oils", async (_req, res) => {
  const staged = await prisma.stagingAffectedOil.findMany();
  await prisma.$transaction([
    prisma.affectedOil.deleteMany(),
    prisma.affectedOil.createMany({
      data: staged.map((r) => ({
        brand: r.brand,
        productName: r.productName,
        lotNumber: r.lotNumber,
        expiryDate: r.expiryDate,
        note: r.note,
      })),
    }),
  ]);
  res.json({ published: staged.length });
});
