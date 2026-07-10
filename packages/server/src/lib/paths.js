import path from "node:path";

export const REPO_ROOT = path.resolve(process.env.REPO_ROOT ?? "../..");
export const ARCHIVE_ROOT = path.join(REPO_ROOT, "source data", "_archive");
export const OUTPUT_ROOT = path.join(REPO_ROOT, "output");
export const EXTRACT_SCRIPT_PATH = path.join(REPO_ROOT, "packages", "extract-pdfs", "extract_pdfs.py");
