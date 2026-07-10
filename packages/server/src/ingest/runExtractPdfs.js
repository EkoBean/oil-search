import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { EXTRACT_SCRIPT_PATH, OUTPUT_ROOT, REPO_ROOT } from "../lib/paths.js";

const execFileAsync = promisify(execFile);

const PYTHON_BIN = process.env.PYTHON_BIN ?? "python";

// 每種 docType 對應固定的輸出檔名，loadStagingFromCsv.js 讀的是同一份檔名。
const OUTPUT_FILENAMES = {
  downstream_vendors: "下游業者清單.csv",
  recall_products: "預防性下架產品清單.csv",
};

/**
 * 執行 extract_pdfs.py，處理單一 docType 的來源 PDF。
 * 不論 PDF 是每小時輪詢下載的，還是後台手動上傳的，呼叫端只要給 docType + 檔案路徑即可。
 */
export async function runExtractPdfs({ docType, inputPath }) {
  const outputFileName = OUTPUT_FILENAMES[docType];
  if (!outputFileName) {
    throw new Error(`未知的 docType: ${docType}`);
  }
  const outputPath = path.join(OUTPUT_ROOT, outputFileName);

  const { stdout, stderr } = await execFileAsync(
    PYTHON_BIN,
    [EXTRACT_SCRIPT_PATH, "--doc-type", docType, "--input", inputPath, "--output", outputPath],
    { cwd: REPO_ROOT }
  );
  if (stderr) {
    console.warn("[extract_pdfs.py stderr]", stderr);
  }
  console.log("[extract_pdfs.py stdout]", stdout);
  return outputPath;
}
