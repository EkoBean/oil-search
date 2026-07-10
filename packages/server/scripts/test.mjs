import "../src/ingest/extractFileId.js";
import { config } from "dotenv"; // 從 dotenv 模組中匯入 config 函數
config({ path: '../.env' });
import { findPdfLink } from "../src/ingest/findPdfLink.js";
import { extractFileId } from "../src/ingest/extractFileId.js";

async function test() {
    const dowStreamAndOilsUrl = process.env.FDA_DOWNSTREAM_AND_OILS_URL;
    const recallListUrl = process.env.FDA_RECALL_LIST_URL;

    const downloadUrl = "https://www.fda.gov.tw/tc/includes/GetFile.ashx?id=f639189545197588185&type=2&cid=51280"

    if (!dowStreamAndOilsUrl || !recallListUrl) {
        console.error("❌ 環境變數沒有設定這些網址，請檢查 .env");
        return;
    }


    console.log(extractFileId(downloadUrl))
}

test();