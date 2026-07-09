import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.resolve(process.env.REPO_ROOT ?? "../..");
const PYTHON_BIN = process.env.PYTHON_BIN ?? "python";
const SCRIPT_PATH = path.join(REPO_ROOT, "packages", "extract-pdfs", "extract_pdfs.py");

/**
 * 執行 extract_pdfs.py。腳本一次會重算兩份 CSV（下游業者清單 + 預防性下架清單），
 * 目前沒有拆分成「只處理其中一份來源」的參數，所以不管哪一份 PDF 更新，
 * 都整個重跑一次——反正是 idempotent，兩份輸出都會被覆寫成最新結果。
 */
export async function runExtractPdfs() {
  const { stdout, stderr } = await execFileAsync(PYTHON_BIN, [SCRIPT_PATH], {
    cwd: REPO_ROOT,
  });
  if (stderr) {
    console.warn("[extract_pdfs.py stderr]", stderr);
  }
  console.log("[extract_pdfs.py stdout]", stdout);
}
