import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { prisma } from "../lib/prisma.js";
import { ARCHIVE_ROOT, FLOW_CHART_PICS_ROOT, REPO_ROOT, RENDER_SCRIPT_PATH } from "../lib/paths.js";

const execFileAsync = promisify(execFile);

const PYTHON_BIN = process.env.PYTHON_BIN ?? "python";
const URL_PREFIX = "/media/flow-chart";

// 頁圖檔名固定為 <上傳時間戳>-page-<頁碼>.png；時間戳讓每個版本的網址都不同，
// 換版時瀏覽器不會拿到快取的舊圖。
const PAGE_FILE_RE = /^(\d+)-page-(\d+)\.png$/;

/**
 * 下游流向圖上傳的完整流程：PDF 存檔到 _archive → 叫 render_pdf_pages.py 逐頁轉 PNG
 * → 刪掉上一版頁圖 → 寫入 FlowChartUpdate。流向圖是簡報式流程圖，不解析、不 staging，
 * 轉完圖即視為發布。
 */
export async function renderAndPublishFlowChart({ buffer, originalName }) {
  const timestamp = Date.now();

  // 原始 PDF 照手動上傳的慣例留檔在 _archive，之後要回頭核對有依據
  await fs.mkdir(ARCHIVE_ROOT, { recursive: true });
  const pdfPath = path.join(ARCHIVE_ROOT, `flow_chart_manual-${timestamp}.pdf`);
  await fs.writeFile(pdfPath, buffer);

  const { stdout, stderr } = await execFileAsync(
    PYTHON_BIN,
    [RENDER_SCRIPT_PATH, "--input", pdfPath, "--output-dir", FLOW_CHART_PICS_ROOT, "--basename", String(timestamp)],
    { cwd: REPO_ROOT }
  );
  if (stderr) {
    console.warn("[render_pdf_pages.py stderr]", stderr);
  }
  const { pages: pageCount } = JSON.parse(stdout.trim().split("\n").at(-1));

  // 轉圖成功才清掉舊版頁圖——失敗時公開站至少還有上一版可看
  const entries = await fs.readdir(FLOW_CHART_PICS_ROOT);
  await Promise.all(
    entries
      .filter((name) => PAGE_FILE_RE.test(name) && !name.startsWith(`${timestamp}-`))
      .map((name) => fs.unlink(path.join(FLOW_CHART_PICS_ROOT, name)))
  );

  const update = await prisma.flowChartUpdate.create({
    data: { originalName, pageCount },
  });

  return { ...update, pages: await listFlowChartPics() };
}

/**
 * 目前這一版流向圖的頁圖網址，依頁碼排序。
 * @returns {Promise<{filename: string, path: string, page: number}[]>}
 */
export async function listFlowChartPics() {
  let entries = [];
  try {
    entries = await fs.readdir(FLOW_CHART_PICS_ROOT);
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  return entries
    .map((name) => {
      const match = name.match(PAGE_FILE_RE);
      return match && { filename: name, path: `${URL_PREFIX}/${name}`, page: Number(match[2]) };
    })
    .filter(Boolean)
    .sort((a, b) => a.page - b.page);
}
