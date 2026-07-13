import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { AFFECTED_OIL_PICS_ROOT } from "../lib/paths.js";

// PUBLIC_ORIGIN：server 對外的完整網址（例如 https://xxx.up.railway.app）。
// 前端跟 server 部署在不同網域時，/media/... 相對路徑會被解析成前端自己的網域，
// 所以圖片路徑要挾帶完整 origin；本機開發沒設就維持相對路徑（走 vite proxy）。
const URL_PREFIX = `${process.env.PUBLIC_ORIGIN ?? ""}/media/affected-oils`;

// multer middleware
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

// pic writeFile
export async function saveAffectedOilPic({ buffer, originalName }) {
  const ext = path.extname(originalName) || ".jpg";
  const filename = `${randomUUID()}${ext}`;

  await fs.mkdir(AFFECTED_OIL_PICS_ROOT, { recursive: true });
  await fs.writeFile(path.join(AFFECTED_OIL_PICS_ROOT, filename), buffer);

  return { filename, path: `${URL_PREFIX}/${filename}` };
}

// get pic list
export async function listAffectedOilPics() {
  let entries = [];
  try {
    entries = await fs.readdir(AFFECTED_OIL_PICS_ROOT, { withFileTypes: true });
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name !== ".gitkeep")
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
