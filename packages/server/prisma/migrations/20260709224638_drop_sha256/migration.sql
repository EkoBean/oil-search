/*
  Warnings:

  - You are about to drop the column `sha256` on the `SourceDocument` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SourceDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "docType" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "filePath" TEXT,
    "status" TEXT NOT NULL,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadedAt" DATETIME,
    "processedAt" DATETIME,
    "errorMessage" TEXT
);
INSERT INTO "new_SourceDocument" ("checkedAt", "docType", "downloadUrl", "downloadedAt", "errorMessage", "fileId", "filePath", "id", "processedAt", "sourceUrl", "status") SELECT "checkedAt", "docType", "downloadUrl", "downloadedAt", "errorMessage", "fileId", "filePath", "id", "processedAt", "sourceUrl", "status" FROM "SourceDocument";
DROP TABLE "SourceDocument";
ALTER TABLE "new_SourceDocument" RENAME TO "SourceDocument";
CREATE INDEX "SourceDocument_docType_fileId_idx" ON "SourceDocument"("docType", "fileId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
