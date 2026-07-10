# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

This started as a small data-extraction prototype and is growing into a full system: watch Taiwan FDA's "問題油品" (tainted cooking oil) recall announcement pages, re-extract the source PDFs when they change, stage the results for admin review, and publish reviewed data to a public query site. To get to a working end-to-end pipeline (and the public query frontend) faster, admins can also upload a source PDF by hand instead of waiting on the poller — both paths converge on the same staging/review/publish flow (`ingest/extractAndStage.js`), so the two ingestion methods can run side by side without duplicating that logic. It's now an npm workspaces monorepo:

- `packages/extract-pdfs/` — the original Python/pdfplumber extraction script (unchanged cleaning logic; now takes its input/output paths and doc type as CLI args instead of hardcoding `source data/`/`output/`, so it can run against ad-hoc uploaded files, not just the poller's downloads).
- `packages/server/` — Express server: hourly `node-cron` poll of the FDA pages, plus an admin PDF upload endpoint (`POST /api/admin/upload`) for the manual path. Either one spawns the Python script when a source PDF needs (re-)processing, loads results into SQLite staging tables (via Prisma), notifies the admin via Discord webhook, and serves both an admin API and a public read API.
- `packages/admin-web/` — Vite/React admin UI (review staging data, manually enter 受影響油品資訊, publish).
- `packages/public-web/` — Vite/React public query site (fetches each published table wholesale, filters client-side — see `doc/` for the reasoning; only revisit this if a table grows past roughly 10-30k rows).

Source PDFs tracked by the pipeline:

- `source data/下游業者360家清單_(截至7月9日).pdf` — list of ~360 downstream vendors/retailers that received the product, with lot numbers and expiry dates. Auto-extracted, but still needs a human-added 備註 before publish.
- `source data/預防性下架產品清單.pdf` — list of products pulled from shelves as a precaution. Auto-extracted.
- 受影響油品資訊 (affected oils) — image+text PDF on the same FDA page as the downstream list, entered manually by an admin; not run through `extract_pdfs.py`.

Output CSVs from the Python script go to `output/`; versioned raw PDF downloads made by the poller go to `source data/_archive/` (gitignored).

## Running the extraction script standalone

```bash
python packages/extract-pdfs/extract_pdfs.py --doc-type downstream_vendors --input "source data/下游業者360家清單_(截至7月9日).pdf" --output "output/下游業者清單.csv"
python packages/extract-pdfs/extract_pdfs.py --doc-type recall_products --input "source data/預防性下架產品清單.pdf" --output "output/預防性下架產品清單.csv"
```

`--doc-type`, `--input`, and `--output` are all required — the script no longer knows about `source data/`/`output/` itself; those paths are the caller's responsibility (`packages/server/src/ingest/runExtractPdfs.js` resolves them via `packages/server/src/lib/paths.js` and always spawns the script with `cwd` set to the repo root rather than the package directory). Requires `pdfplumber` (already installed in the Anaconda environment on this machine: `/c/ProgramData/anaconda3/python`; the `PYTHON_BIN` env var lets the Node server point at a different interpreter, e.g. `python3` inside Docker).

## Running the full system locally

```bash
npm install                                  # from repo root, installs all workspaces
cd packages/server && cp .env.example .env   # fill in DISCORD_WEBHOOK_URL etc.
npx prisma migrate dev                       # creates packages/server/data/oil-search.db
npm run dev                                  # starts Express on :3000, hourly cron included
```

`admin-web` and `public-web` are standard Vite apps (`npm run dev` inside each). `docker-compose.yml` at the repo root runs just the `server` service (Node + Python in one image, see `packages/server/Dockerfile`) — there is no Postgres container; SQLite is a file on a mounted volume (`./data`).

There is no test suite, lint config, or build step — this is a one-shot data-cleaning script, verified by inspecting the printed row counts and spot-checking `output/*.csv`.

## Architecture

`extract_pdfs.py` has three stages per PDF:

1. **`extract_raw_tables`** — pulls raw table rows (as lists, with `None` for empty cells) out of every page via `pdfplumber`. Table structure varies per page (repeated headers, page-break artifacts), so nothing is cleaned yet at this stage.

2. **Per-PDF cleaning function** — the two source PDFs have different quirks, so each gets its own cleaner:
   - `clean_downstream_list` (for 下游業者360家清單): cells are frequently `None` because a vendor spans multiple product rows in the source table — requires **forward-filling** 序號/縣市/業者 from the last non-`None` row, and **exploding** cells where a single cell packs multiple 批號/有效日期 values separated by `\n`. It distinguishes "text wrapped because it's long" from "genuinely multiple values" by comparing line counts across the 品項/批號/有效日期 columns (`n_bd` logic). Rows it can't confidently resolve get flagged in a `備註` column for manual review rather than dropped or guessed.
   - `clean_recall_list` (for 預防性下架產品清單): rows are already complete (no forward-fill needed); only strips stray `\n` inside the 有效日期 cell.

3. **`write_csv`** — writes `utf-8-sig` (BOM) so the CSVs open correctly in Excel on Windows with Traditional Chinese headers intact.

`main()` dispatches on `--doc-type` (via the `DOC_TYPES` dict mapping doc type to its cleaner + CSV fieldnames) and prints a summary — for `downstream_vendors` that includes how many rows were flagged for manual review (`備註` non-empty).

On the Node side, `packages/server/src/ingest/extractAndStage.js` is the shared pipeline that runs after a source PDF is available (spawn `extract_pdfs.py` → load the resulting CSV into the matching `Staging*` table → mark the `SourceDocument` `pending_review` → notify admin via Discord). Both ingestion paths feed into it with a `SourceDocument` row: the poller (`cron/pollFdaUpdates.js`, after `downloadPdf.js`) and manual upload (`api/admin/index.js`'s `POST /upload` → `ingest/uploadManualPdf.js`). Manual uploads don't have a real FDA download URL/fileId to key off of, so `uploadManualPdf.js` stamps `sourceUrl`/`downloadUrl` with a `manual-upload` sentinel and derives `fileId` from the upload timestamp rather than the `GetFile.ashx?id=...` parameter the poller uses.

## Working with the source PDFs

If you're asked to re-run this on updated source PDFs or adapt it to a new one, know that `pdfplumber`'s `extract_tables()` output is fragile to the PDF's exact layout — expect `None` cells, duplicate header rows per page, and multi-value cells joined by `\n` inside a single table cell. Before changing the cleaning logic, dump `extract_raw_tables()` output for the specific PDF and inspect it manually rather than assuming the same quirks as the existing two PDFs apply.
