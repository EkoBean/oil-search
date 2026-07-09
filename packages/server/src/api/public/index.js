import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

export const publicRouter = Router();

// 三個查詢頁各自對應一支整包資料的端點，前端 fetch 一次後在瀏覽器端做篩選。
// 之後要優化成靜態 JSON（發布時 dump 檔案）可以直接替換這幾支 handler，
// 前端呼叫的路徑不用改。

publicRouter.get("/downstream-vendors", async (_req, res) => {
  const rows = await prisma.downstreamVendor.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

publicRouter.get("/recall-products", async (_req, res) => {
  const rows = await prisma.recallProduct.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

publicRouter.get("/affected-oils", async (_req, res) => {
  const rows = await prisma.affectedOil.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});
