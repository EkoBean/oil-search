目錄結構（npm workspaces monorepo）

oil-search/
├── package.json              # npm workspaces root
├── docker-compose.yml        # server service
├── source data/  output/     
├── packages/
│   ├── extract-pdfs/         # 原 scripts/extract_pdfs.py 搬過來 + requirements.txt
│   ├── server/                # Express + node-cron + Prisma(SQLite) + Dockerfile
│   │   ├── prisma/schema.prisma   # SourceDocument + 三組 staging/published 表
│   │   └── src/
│   │       ├── ingest/        # 找PDF連結、下載+hash比對、spawn python、CSV匯入staging
│   │       ├── cron/          # 每小時輪詢邏輯 pollFdaUpdates.js
│   │       ├── notify/        # Discord webhook
│   │       └── api/admin, api/public
│   ├── admin-web/             # Vite React（剛 scaffold，尚未寫功能）
│   └── public-web/            # Vite React（剛 scaffold，尚未寫功能）
