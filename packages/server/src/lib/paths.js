import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(process.env.REPO_ROOT ?? "../..");
export const ARCHIVE_ROOT = path.join(REPO_ROOT, "source data", "_archive");
export const OUTPUT_ROOT = path.join(REPO_ROOT, "output");
export const EXTRACT_SCRIPT_PATH = path.join(REPO_ROOT, "packages", "extract-pdfs", "extract_pdfs.py");


const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(__dirname, "..", "..");
export const UPLOADS_ROOT = path.join(SERVER_ROOT, "data", "uploads");
export const AFFECTED_OIL_PICS_ROOT = path.join(UPLOADS_ROOT, "affected-oils");
