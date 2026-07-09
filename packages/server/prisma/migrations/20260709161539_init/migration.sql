-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "docType" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "errorMessage" TEXT
);

-- CreateTable
CREATE TABLE "StagingDownstreamVendor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceDocId" INTEGER NOT NULL,
    "seq" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "note" TEXT,
    "reviewedNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DownstreamVendor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seq" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "note" TEXT,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StagingRecallProduct" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceDocId" INTEGER NOT NULL,
    "vendorSeq" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "productSeq" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RecallProduct" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vendorSeq" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "productSeq" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StagingAffectedOil" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceDocId" INTEGER NOT NULL,
    "brand" TEXT,
    "productName" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "expiryDate" TEXT,
    "note" TEXT,
    "enteredBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AffectedOil" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand" TEXT,
    "productName" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "expiryDate" TEXT,
    "note" TEXT,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SourceDocument_docType_sha256_idx" ON "SourceDocument"("docType", "sha256");

-- CreateIndex
CREATE INDEX "DownstreamVendor_county_idx" ON "DownstreamVendor"("county");

-- CreateIndex
CREATE INDEX "DownstreamVendor_lotNumber_idx" ON "DownstreamVendor"("lotNumber");

-- CreateIndex
CREATE INDEX "RecallProduct_productName_idx" ON "RecallProduct"("productName");

-- CreateIndex
CREATE INDEX "AffectedOil_lotNumber_idx" ON "AffectedOil"("lotNumber");
