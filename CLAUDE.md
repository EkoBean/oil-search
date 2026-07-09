# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

This started as a small data-extraction prototype and is growing into a full system: an hourly poller that watches Taiwan FDA's "問題油品" (tainted cooking oil) recall announcement pages, re-extracts the source PDFs when they change, stages the results for admin review, and publishes reviewed data to a public query site. It's now an npm workspaces monorepo:

- `packages/extract-pdfs/` — the original Python/pdfplumber extraction script (unchanged logic, just relocated).
- `packages/server/` — Express server: hourly `node-cron` poll of the FDA pages, spawns the Python script when a source PDF changes, loads results into SQLite staging tables (via Prisma), notifies the admin via Discord webhook, and serves both an admin API and a public read API.
- `packages/admin-web/` — Vite/React admin UI (review staging data, manually enter 受影響油品資訊, publish).
- `packages/public-web/` — Vite/React public query site (fetches each published table wholesale, filters client-side — see `doc/` for the reasoning; only revisit this if a table grows past roughly 10-30k rows).

Source PDFs tracked by the pipeline:

- `source data/下游業者360家清單_(截至7月9日).pdf` — list of ~360 downstream vendors/retailers that received the product, with lot numbers and expiry dates. Auto-extracted, but still needs a human-added 備註 before publish.
- `source data/預防性下架產品清單.pdf` — list of products pulled from shelves as a precaution. Auto-extracted.
- 受影響油品資訊 (affected oils) — image+text PDF on the same FDA page as the downstream list, entered manually by an admin; not run through `extract_pdfs.py`.

Output CSVs from the Python script go to `output/`; versioned raw PDF downloads made by the poller go to `source data/_archive/` (gitignored).

## Running the extraction script standalone

```bash
python packages/extract-pdfs/extract_pdfs.py
```

Run from the repo root — the script uses relative paths (`source data/`, `output/`) hardcoded via `SRC_DIR`/`OUT_DIR` constants; this is also why `packages/server/src/ingest/runExtractPdfs.js` always spawns it with `cwd` set to the repo root rather than the package directory. Requires `pdfplumber` (already installed in the Anaconda environment on this machine: `/c/ProgramData/anaconda3/python`; the `PYTHON_BIN` env var lets the Node server point at a different interpreter, e.g. `python3` inside Docker).

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

`main()` wires the two source PDFs to their cleaners and prints a summary including how many rows were flagged for manual review (`備註` non-empty) in the downstream list.

## Working with the source PDFs

If you're asked to re-run this on updated source PDFs or adapt it to a new one, know that `pdfplumber`'s `extract_tables()` output is fragile to the PDF's exact layout — expect `None` cells, duplicate header rows per page, and multi-value cells joined by `\n` inside a single table cell. Before changing the cleaning logic, dump `extract_raw_tables()` output for the specific PDF and inspect it manually rather than assuming the same quirks as the existing two PDFs apply.
