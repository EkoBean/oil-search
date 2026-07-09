import "../src/ingest/findPdfLink.js";
import { config } from "dotenv"; // 從 dotenv 模組中匯入 config 函數
config({ path: '../.env' });
import { findPdfLink } from "../src/ingest/findPdfLink.js";

async function test() {
    const dowStreamAndOilsUrl = process.env.FDA_DOWNSTREAM_AND_OILS_URL;
    const recallListUrl = process.env.FDA_RECALL_LIST_URL;

    if (!dowStreamAndOilsUrl || !recallListUrl) {
        console.error("❌ 環境變數沒有設定這些網址，請檢查 .env");
        return;
    }
    console.log(

    );
    try {
        const result = await findPdfLink(dowStreamAndOilsUrl, "受影響油品")
        console.log(result);
    } catch (err) {
        console.err(err)
    }
}

test();