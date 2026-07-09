# -*- coding: utf-8 -*-
"""
快速原型：用 pdfplumber 把 source data 裡的兩份 PDF 整理成資料表 (CSV)。

1. 下游業者360家清單_(截至7月9日).pdf
   欄位: 序號, 縣市, 業者, 品項, 批號, 有效日期
   - 同一業者有多項產品時，序號/縣市/業者 只在第一列出現，之後為 None -> 需要 forward fill
   - 同一產品有多個批號/有效日期時，儲存格內用 \n 分隔多筆 -> 展開成多列
   - 少數列品項也是 None -> 視為延續前一列的品項 (只是多列出批號/日期)
   - 頁面第一列的標題文字、每頁重複的表頭列、最後的備註列 -> 過濾掉

2. 預防性下架產品清單.pdf
   欄位: 業者序號, 縣市, 業者, 產品序號, 產品名稱, 有效日期
   - 每一列資料完整，不需要 forward fill
   - 有效日期欄位偶爾用 \n 換行包住過長文字 (用頓號分隔的多個日期) -> 直接去除換行即可
"""
import csv
import pdfplumber

SRC_DIR = "source data"
OUT_DIR = "output"

HEADER_1 = ["序號", "縣市", "業者", "品項", "批號", "有效日期"]
HEADER_2 = ["業者序號", "縣市", "業者", "產品序號", "產品名稱", "有效日期"]


def extract_raw_tables(pdf_path):
    """回傳所有頁面 table rows 串接後的清單 (保留 None)。"""
    all_rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                all_rows.extend(table)
    return all_rows


def clean_downstream_list(rows):
    """處理『下游業者360家清單』，回傳展開後的 dict list，並附上待人工複核的旗標。"""
    records = []
    cur_seq = cur_city = cur_biz = None
    last_item = None
    seen_header = False

    for row in rows:
        seq, city, biz, item, batch, date = row

        # 跳過標題列 (只有第一欄有值，其餘為 None)
        if seq is not None and all(v is None for v in (city, biz, item, batch, date)):
            continue
        # 跳過每頁重複的表頭列
        if [seq, city, biz, item, batch, date] == HEADER_1:
            continue
        # 跳過結尾備註列 (以「備註」開頭)
        if seq is not None and isinstance(seq, str) and seq.startswith("備註"):
            continue

        flag = ""

        if seq is not None:
            cur_seq, cur_city, cur_biz = seq, city, biz
        else:
            # 少數列只出現縣市、序號與業者仍為 None -> 來源 PDF 排版異常，無法確定業者
            if city is not None and biz is None:
                cur_city = city
                flag = "業者資料缺失(來源PDF排版異常，請人工複核)"
            elif city is not None:
                cur_city = city

        if item is None:
            item = last_item
            flag = flag or "延續前一列品項的批號/日期"

        item_lines = item.split("\n") if item else [""]
        batch_lines = batch.split("\n") if batch else [""]
        date_lines = date.split("\n") if date else [""]
        # n_bd = 這一格實際代表幾筆「批號/日期」；品項欄位有時只是文字太長被換行包住
        # (與批號/日期筆數無關)，要跟真正對應多筆批號/日期的換行分開處理
        n_bd = max(len(batch_lines), len(date_lines))

        if n_bd > 1 and len(item_lines) == n_bd:
            # 品項、批號、日期都對應同樣筆數 -> 逐筆展開成多列
            item_full = None
            for i in range(n_bd):
                records.append({
                    "序號": cur_seq, "縣市": cur_city, "業者": cur_biz,
                    "品項": item_lines[i],
                    "批號": batch_lines[i] if i < len(batch_lines) else batch_lines[-1],
                    "有效日期": date_lines[i] if i < len(date_lines) else date_lines[-1],
                    "備註": flag,
                })
        else:
            # 品項是單一名稱 (可能因太長被換行包住，直接接起來)，套用到每筆批號/日期
            item_full = "".join(item_lines)
            for i in range(n_bd):
                records.append({
                    "序號": cur_seq, "縣市": cur_city, "業者": cur_biz,
                    "品項": item_full,
                    "批號": batch_lines[i] if i < len(batch_lines) else batch_lines[-1],
                    "有效日期": date_lines[i] if i < len(date_lines) else date_lines[-1],
                    "備註": flag,
                })

        last_item = item_full if item_full is not None else item_lines[0]

        # 換行造成品項被拆成獨立的一列，但批號/日期其實跟前一列完全重複 -> 屬於幻影列，去除
        if len(records) >= 2 and records[-1] == records[-2]:
            records.pop()

    return records


def clean_recall_list(rows):
    """處理『預防性下架產品清單』，欄位完整不需要 forward fill，只需清換行。"""
    records = []
    for row in rows:
        if row == HEADER_2 or row == ["業者\n序號", "縣市", "業者", "產品\n序號", "產品名稱", "有效日期"]:
            continue
        if all(v is None for v in row):
            continue
        biz_seq, city, biz, prod_seq, prod_name, date = row
        records.append({
            "業者序號": biz_seq,
            "縣市": city,
            "業者": biz,
            "產品序號": prod_seq,
            "產品名稱": (prod_name or "").replace("\n", ""),
            "有效日期": (date or "").replace("\n", ""),
        })
    return records


def write_csv(path, fieldnames, records):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def main():
    rows1 = extract_raw_tables(f"{SRC_DIR}/下游業者360家清單_(截至7月9日).pdf")
    records1 = clean_downstream_list(rows1)
    write_csv(f"{OUT_DIR}/下游業者清單.csv",
              ["序號", "縣市", "業者", "品項", "批號", "有效日期", "備註"], records1)

    rows2 = extract_raw_tables(f"{SRC_DIR}/預防性下架產品清單.pdf")
    records2 = clean_recall_list(rows2)
    write_csv(f"{OUT_DIR}/預防性下架產品清單.csv",
              ["業者序號", "縣市", "業者", "產品序號", "產品名稱", "有效日期"], records2)

    distinct_biz = {r["序號"] for r in records1 if r["序號"] is not None}
    flagged = [r for r in records1 if r["備註"]]

    print(f"下游業者清單: {len(records1)} 列 (展開後), 涵蓋 {len(distinct_biz)} 個業者序號")
    print(f"  其中需人工複核: {len(flagged)} 列")
    print(f"預防性下架產品清單: {len(records2)} 列")


if __name__ == "__main__":
    main()
