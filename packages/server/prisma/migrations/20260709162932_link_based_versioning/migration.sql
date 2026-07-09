/*
  Warnings:

  - You are about to drop the column `fetchedAt` on the `SourceDocument` table. All the data in the column will be lost.
  - Added the required column `downloadUrl` to the `SourceDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileId` to the `SourceDocument` table without a default value. This is not possible if the table is not empty.

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
    "sha256" TEXT,
    "status" TEXT NOT NULL,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadedAt" DATETIME,
    "processedAt" DATETIME,
    "errorMessage" TEXT
);
INSERT INTO "new_SourceDocument" ("docType", "errorMessage", "filePath", "id", "processedAt", "sha256", "sourceUrl", "status") SELECT "docType", "errorMessage", "filePath", "id", "processedAt", "sha256", "sourceUrl", "status" FROM "SourceDocument";
DROP TABLE "SourceDocument";
ALTER TABLE "new_SourceDocument" RENAME TO "SourceDocument";
CREATE INDEX "SourceDocument_docType_fileId_idx" ON "SourceDocument"("docType", "fileId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
