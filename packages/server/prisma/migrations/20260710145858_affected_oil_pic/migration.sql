/*
  Warnings:

  - You are about to drop the column `note` on the `AffectedOil` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AffectedOil" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand" TEXT,
    "productPicPath" TEXT,
    "productName" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "expiryDate" TEXT,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AffectedOil" ("brand", "expiryDate", "id", "lotNumber", "productName", "publishedAt") SELECT "brand", "expiryDate", "id", "lotNumber", "productName", "publishedAt" FROM "AffectedOil";
DROP TABLE "AffectedOil";
ALTER TABLE "new_AffectedOil" RENAME TO "AffectedOil";
CREATE INDEX "AffectedOil_lotNumber_idx" ON "AffectedOil"("lotNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
