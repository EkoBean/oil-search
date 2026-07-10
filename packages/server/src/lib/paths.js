import path from "node:path";

export const REPO_ROOT = path.resolve(process.env.REPO_ROOT ?? "../..");
export const ARCHIVE_ROOT = path.join(REPO_ROOT, "source data", "_archive");
export const OUTPUT_ROOT = path.join(REPO_ROOT, "output");
export const EXTRACT_SCRIPT_PATH = path.join(REPO_ROOT, "packages", "extract-pdfs", "extract_pdfs.py");

// server 進程一律從 packages/server 這層啟動（本機 npm script、Docker WORKDIR 皆同），
// 用 cwd 當 server 自己的 root，跟 DB 檔案（見 DATABASE_URL）放在同一顆 volume 底下。
export const SERVER_ROOT = process.cwd();
export const UPLOADS_ROOT = path.join(SERVER_ROOT, "data", "uploads");
export const AFFECTED_OIL_PICS_ROOT = path.join(UPLOADS_ROOT, "affected-oils");
