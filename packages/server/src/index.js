import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { adminRouter } from "./api/admin/index.js";
import { publicRouter } from "./api/public/index.js";
import { UPLOADS_ROOT } from "./lib/paths.js";
// import { pollFdaUpdates } from "./cron/pollFdaUpdates.js";

const app = express();

// 前端（admin-web/public-web）部署後跟 server 不同網域，用逗號分隔的白名單開放 CORS；
// 沒設就放行全部（本機開發時 Vite proxy 本來就同源，這條不影響 dev）
const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : true }));

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/media", express.static(UPLOADS_ROOT));

// enable enviroment while adding function
if (process.env.ENABLE_ADMIN_API !== "false") {
  app.use("/api/admin", adminRouter);
} else {
  console.log("[server] ENABLE_ADMIN_API=false，未掛載 /api/admin");
}
app.use("/api/public", publicRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[server] listening on port ${port}`);
});

// 每小時的第 0 分執行一次
// cron.schedule("0 * * * *", () => {
//   pollFdaUpdates().catch((err) => console.error("[cron] pollFdaUpdates 未預期錯誤:", err));
// });
