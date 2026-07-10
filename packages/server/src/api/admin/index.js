import { Router } from "express";
import multer from "multer";
import { prisma } from "../../lib/prisma.js";
import { uploadManualPdf } from "../../ingest/uploadManualPdf.js";

export const adminRouter = Router();

// TODO: 這一整個 router 目前沒有任何登入驗證，正式上線前一定要加
// session/JWT 之類的機制，並且套用在 index.js mount 這個 router 的地方。


// Each multer file contains the following information:
// Key	Description	Note
// fieldname :	Field name specified in the form	
// originalname :	Name of the file on the user's computer	
// encoding :	Encoding type of the file	
// mimetype :	Mime type of the file	
// size :	Size of the file in bytes

// multer options
// dest or storage :	Where to store the files
// fileFilter :	Function to control which files are accepted
// limits :	Limits of the uploaded data
// preservePath :	Keep the full path of files instead of just the base name
// defParamCharset :	Default character set to use for values of part header parameters (e.g. filename) that are not extended parameters (that contain an explicit charset). Default: 'latin1'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("只接受 PDF 檔案"), false);
    }
    cb(null, true);
  },
});

// 手動上傳 PDF：擱置自動輪詢時的快速上線路徑，admin 自己選 docType + 上傳 PDF，
// 走跟 pollFdaUpdates 完全一樣的 extractAndStage（parse -> staging -> 待審核通知）。
adminRouter.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "缺少上傳檔案 (file)" });
  }
  const { docType } = req.body;
  if (!docType) {
    return res.status(400).json({ error: "缺少 docType" });
  }

  try {
    const sourceDoc = await uploadManualPdf({
      docType,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
    });
    res.status(201).json(sourceDoc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------- 下游業者清單 ----------

adminRouter.get("/staging/downstream-vendors", async (_req, res) => {
  const rows = await prisma.stagingDownstreamVendor.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

// add note
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
