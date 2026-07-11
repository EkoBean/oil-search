-- CreateTable
CREATE TABLE "FlowChartUpdate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originalName" TEXT,
    "pageCount" INTEGER NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RecallStat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "incident" TEXT NOT NULL,
    "asOf" TEXT NOT NULL,
    "recalledTonnage" REAL NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
