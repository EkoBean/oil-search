FDA 網站 (3個來源頁面)
      │  (每小時輪詢)
      ▼
┌─────────────────┐
│  Node.js Server  │──(有更新)──▶ 下載 PDF ──▶ spawn python extract_pdfs.py
│  (Express)       │                                    │
│  - node-cron     │◀───────────────── 寫入 CSV ────────┘
│  - REST API      │
└────────┬─────────┘
         │ 寫入 staging_* 表 ──▶ 通知管理員
         ▼
   [staging tables]  ←── 管理員後台(React) 人工核對/補備註/手動輸入受影響油品
         │ 核准
         ▼
   [published tables] ←── 民眾查詢前台(React) 三種查詢功能
