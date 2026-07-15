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
  fushou_downstream: "福壽自行揭露下游業者清單.csv",
  fumao_downstream: "福懋自行揭露下游業者清單.csv",
  taishan_downstream: "泰山自行揭露下游業者清單.csv",
};

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
