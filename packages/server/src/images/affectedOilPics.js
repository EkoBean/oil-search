import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { AFFECTED_OIL_PICS_ROOT } from "../lib/paths.js";

// 靜態檔案掛載路徑（見 index.js），跟 /api/admin/affected-oil-pics 這支管理用的 API 分開，
// 避免「操作圖庫的 API」和「圖片檔案本身的網址」撞名混淆。
const URL_PREFIX = "/media/affected-oils";

// multipart 解析中介層：接收單一張圖片欄位 "file"，限制格式/大小。
// 路由端只管把它接到 Express pipeline 上、處理錯誤，不需要知道格式驗證細節。
export const affectedOilPicUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return cb(new Error("只接受 JPEG / PNG / WebP 圖片"), false);
    }
    cb(null, true);
  },
}).single("file");

// 存進圖庫目錄，回傳可直接當 <img src> 用的網址路徑。
// 同一張圖可以被多筆油品資料共用，共用不需要另外處理，前端把同一個 path 填進多筆資料即可。
export async function saveAffectedOilPic({ buffer, originalName }) {
  const ext = path.extname(originalName) || ".jpg";
  const filename = `${randomUUID()}${ext}`;

  await fs.mkdir(AFFECTED_OIL_PICS_ROOT, { recursive: true });
  await fs.writeFile(path.join(AFFECTED_OIL_PICS_ROOT, filename), buffer);

  return { filename, path: `${URL_PREFIX}/${filename}` };
}

// 圖庫列表：讓後台在「新增/編輯油品」表單裡可以直接勾選既有照片，不用每筆都重新上傳。
export async function listAffectedOilPics() {
  let entries;
  try {
    entries = await fs.readdir(AFFECTED_OIL_PICS_ROOT, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const stat = await fs.stat(path.join(AFFECTED_OIL_PICS_ROOT, entry.name));
        return {
          filename: entry.name,
          path: `${URL_PREFIX}/${entry.name}`,
          uploadedAt: stat.mtime,
        };
      }),
  );
  files.sort((a, b) => b.uploadedAt - a.uploadedAt);
  return files;
}
