import { Router } from "express";
import multer from "multer";
import { prisma } from "../../lib/prisma.js";
import { uploadManualPdf } from "../../ingest/uploadManualPdf.js";
import { affectedOilPicUpload, saveAffectedOilPic, listAffectedOilPics } from "../../images/affectedOilPics.js";
import { renderAndPublishFlowChart } from "../../images/flowChartPics.js";

export const adminRouter = Router();

// TODO: 這一整個 router 目前沒有任何登入驗證，正式上線前一定要加
// session/JWT 之類的機制，並且套用在 index.js mount 這個 router 的地方。
// 目前先不上線這個API

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

// ---------- 下游流向圖（PDF 逐頁轉圖，直接發布，不 staging）----------

adminRouter.post("/flow-chart", (req, res, next) => {
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
  try {
    const result = await renderAndPublishFlowChart({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------- 回收統計（流向圖黃框數字，人工輸入，整批覆蓋發布）----------

adminRouter.post("/publish/recall-stats", async (req, res) => {
  const { stats } = req.body;
  if (!Array.isArray(stats)) {
    return res.status(400).json({ error: "缺少 stats 陣列" });
  }
  for (const [i, stat] of stats.entries()) {
    if (!stat.incident || !stat.asOf || !Number.isFinite(Number(stat.recalledTonnage))) {
      return res.status(400).json({ error: `第 ${i + 1} 筆缺少 事件名稱、截至時間或回收噸數` });
    }
  }

  await prisma.$transaction([
    prisma.recallStat.deleteMany(),
    prisma.recallStat.createMany({
      data: stats.map((r) => ({
        incident: r.incident,
        asOf: r.asOf,
        recalledTonnage: Number(r.recalledTonnage),
      })),
    }),
  ]);
  res.json({ published: stats.length });
});

// ---------- 下游業者清單 ----------

adminRouter.get("/staging/downstream-vendors", async (_req, res) => {
  const rows = await prisma.stagingDownstreamVendor.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

// add note (one-by-one)
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

// ---------- 受影響油品資訊（純前端表單輸入，無 staging）----------

// 上傳一張油品外觀照片到圖庫；multipart 解析、存檔、檔名、圖庫邏輯都在 images/affectedOilPics.js，
// 這裡只負責接上 Express pipeline、把結果丟回去。
adminRouter.post("/affected-oil-pics", (req, res, next) => {
  affectedOilPicUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "缺少上傳檔案 (file)" });
  }
  const result = await saveAffectedOilPic({ buffer: req.file.buffer, originalName: req.file.originalname });
  res.status(201).json(result);
});

// 圖庫列表：讓後台在「新增/編輯油品」表單裡可以直接勾選既有照片，不用每筆都重新上傳。
adminRouter.get("/affected-oil-pics", async (_req, res) => {
  res.json(await listAffectedOilPics());
});

// 前端表單一次送出整份清單，管理員確認後直接覆蓋發布。
adminRouter.post("/publish/affected-oils", async (req, res) => {
  const { oils } = req.body;
  if (!Array.isArray(oils)) {
    return res.status(400).json({ error: "缺少 oils 陣列" });
  }
  for (const [i, oil] of oils.entries()) {
    if (!oil.productName || !oil.lotNumber || !oil.expiryDate) {
      return res.status(400).json({ error: `第 ${i + 1} 筆缺少 產品名稱、批號或有效日期`  });
    }
  }

  await prisma.$transaction([
    prisma.affectedOil.deleteMany(),
    prisma.affectedOil.createMany({
      data: oils.map((r) => ({
        brand: r.brand ?? null,
        productPicPath: r.productPicPath ?? null,
        productName: r.productName,
        lotNumber: r.lotNumber,
        expiryDate: r.expiryDate ?? null,
      })),
    }),
  ]);
  res.json({ published: oils.length });
});
