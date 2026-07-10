import "dotenv/config";
import express from "express";
import cron from "node-cron";
import { adminRouter } from "./api/admin/index.js";
import { publicRouter } from "./api/public/index.js";
import { UPLOADS_ROOT } from "./lib/paths.js";
// import { pollFdaUpdates } from "./cron/pollFdaUpdates.js";

const app = express();
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
