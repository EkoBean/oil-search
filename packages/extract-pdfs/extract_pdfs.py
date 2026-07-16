# -*- coding: utf-8 -*-
"""
用 pdfplumber 把單一來源 PDF 整理成資料表 (CSV)。輸入/輸出路徑與 doc type 都由外部呼叫端
(Node server 的 ingest/runExtractPdfs.js，不論來源是每小時輪詢下載還是後台手動上傳) 傳入，
本檔案本身不認識 source data/ 或 output/ 這兩個固定路徑。

支援的 --doc-type:

1. downstream_vendors (福壽、福懋、泰山油品下游業者清單；1150716 改版後的版面)
   欄位: 縣市, 序號, 業者, 品項, 批號, 有效日期 (改版後縣市移到第一欄)
   - 縣市是跨很多業者的大合併儲存格，extract_tables() 幾乎抓不回來：部分頁面整個
     縣市欄不在偵測到的表格範圍內 (該頁只剩 5 欄)，就算在表格內、合併儲存格的文字
     也大多不會被指配到任何列。因此這個 doc type 不走 extract_raw_tables()，改用
     extract_downstream_rows()：逐頁拿表格列的 bbox 對照表格左緣縣市標籤文字的
     y 座標 (實測標籤頂端對齊它起始的那一列)，把縣市解回起始列再往下 forward fill
     (含跨頁)，輸出時已補回縣市、統一成 6 欄
   - 同一業者有多項產品時，序號/業者 只在第一列出現，之後為 None -> 需要 forward fill
   - 同一產品有多個批號/有效日期時，儲存格內用 \n 分隔多筆 -> 展開成多列
   - 少數列品項也是 None -> 視為延續前一列的品項 (只是多列出批號/日期)
   - 少數列批號被來源檔以 Excel 科學記號顯示 (例: 2.02704e+13)，完整批號無法還原
     -> 原樣輸出，備註標「原資料以科學記號紀載，無從判定油品序號」交人工複核
   - 資料列跨頁時，序號/業者/品項的文字會落在下一頁表格 bbox 上方之外 (批號/日期
     則留在前一頁最後一列) -> 依欄位 x 區間把孤兒文字重組回前一頁最後一列，
     並標備註交人工複核 (見 _orphan_row_values / _patch_straddling_row)
   - 表頭列只在第一頁出現；頁首標題/批號說明文字不在表格範圍內，不需過濾

2. recall_products (預防性下架產品清單)
   欄位: 業者序號, 縣市, 業者, 產品序號, 產品名稱, 有效日期
   - 每一列資料完整，不需要 forward fill
   - 有效日期欄位偶爾用 \n 換行包住過長文字 (用頓號分隔的多個日期) -> 直接去除換行即可

3. fushou_downstream / fumao_downstream / taishan_downstream (廠商自行揭露下游清單)
   輸出欄位跟 downstream_vendors 一致: 序號, 縣市, 業者, 品項, 批號, 有效日期, 備註，
   讓三家廠商自行揭露的資料可以併入同一張 StagingDownstreamVendor 表跟原始清單一起審核。
   三份来源 PDF 表頭欄位不完全一樣，各自有專屬 cleaner，細節見各 clean_* function 的說明。
   備註欄一律加上「{廠商}自行揭露」，方便審核時分辨資料來源。
   三份來源 PDF 都存在「同一筆業者-品項-批號-有效日期整列重複出現好幾次」的問題
   (福壽實測 96 列裡只有 36 列不重複、福懋 130 列裡只有 97 列不重複)，研判是 FDA
   彙整原始通路明細時沒有先 distinct/JOIN 就直接輸出——三個 cleaner 都會以
   縣市+業者+品項+批號+有效日期 為 key 去重，只保留第一次出現的那筆。

所有帶「縣市」欄位的 doc type (downstream_vendors / recall_products / 三個廠商自行揭露)
都會經過 normalize_county() 統一寫法：台/臺不一致 (台中/臺中)、缺市縣後綴 (南投/南投縣)、
星號備註 (桃園市*)、2014 縣市改制前的舊名 (桃園縣->桃園市) 都會正規化成正式全名；
空字串/None (通常是「零售」列，沒有對應的縣市) 原樣保留，「新竹」這種缺後綴但同時對應
新竹市/新竹縣兩個不同行政區、無法從文字本身判斷是哪一個的案例也保留原文，不用猜的。
"""
import argparse
import csv
import os
from collections import Counter
import pdfplumber

HEADER_1 = ["縣市", "序號", "業者", "品項", "批號", "有效日期"]
HEADER_2 = ["業者序號", "縣市", "業者", "產品序號", "產品名稱", "有效日期"]


def extract_raw_tables(pdf_path):
    """回傳所有頁面 table rows 串接後的清單 (保留 None)。"""
    all_rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                all_rows.extend(table)
    return all_rows


# 縣市標籤的搜尋範圍: 表格左緣再往右這麼多 pt 以內的文字才視為縣市欄標籤。
# 縣市欄在表格範圍內的頁面 (6 欄頁) 剛好涵蓋整個縣市欄；縣市欄落在表格範圍外的
# 頁面 (5 欄頁) 則涵蓋表格左側的標籤區，兩種版面實測都適用。
_COUNTY_STRIP_WIDTH = 28


# 跨頁列重組時加在備註的旗標 (見 _patch_straddling_row)
_STRADDLE_FLAG = "資料列跨頁，序號/業者/品項由座標重組(請人工複核)"


def _column_intervals(table):
    """回傳表格由左到右的欄位 x 區間 [(x0, x1), ...] (由所有儲存格 bbox 去重而來)。"""
    return sorted({(c[0], c[2]) for c in table.cells if c is not None})


def _orphan_row_values(page, table, n_cols):
    """抓「表格上緣之外」的跨頁列文字，依欄位 x 區間重組成一列的值。

    新版面資料列跨頁時，序號/業者/品項的文字會落在下一頁表格 bbox 上方 (該列的
    批號/日期則留在前一頁 grid 的最後一列，序號/業者/品項為 None)。這裡把上方的
    孤兒文字依欄位 x 區間分桶重組；只有「序號欄的值是純數字」才視為有效的跨頁列
    (排除第一頁表格上方的標題/批號說明文字)。沒有有效跨頁列時回傳 None。
    """
    intervals = _column_intervals(table)
    if len(intervals) != n_cols:
        return None
    top, x0, x1 = table.bbox[1], table.bbox[0], table.bbox[2]
    buckets = [[] for _ in intervals]
    for word in page.extract_words():
        if word["top"] >= top or word["x0"] < x0 - 5 or word["x1"] > x1 + 5:
            continue
        center = (word["x0"] + word["x1"]) / 2
        for ci, (cx0, cx1) in enumerate(intervals):
            if cx0 - 2 <= center <= cx1 + 2:
                buckets[ci].append(word)
                break
    values = [
        " ".join(w["text"] for w in sorted(bucket, key=lambda w: w["x0"])) or None
        for bucket in buckets
    ]
    seq = values[1] if n_cols == 6 else values[0]
    if seq is None or not seq.isdigit():
        return None
    return values


def _patch_straddling_row(all_rows, orphan_values, n_cols, current_county):
    """把跨頁列重組回資料。前一頁最後一列如果是「序號/業者為 None 的批號列」，
    孤兒文字就是它遺失的序號/業者/品項 -> 就地回補；否則當成獨立新列附加。
    兩種情況都標 _STRADDLE_FLAG 交人工複核。"""
    if n_cols == 6:
        _, seq, biz, item, batch, date = orphan_values
    else:
        seq, biz, item, batch, date = orphan_values
    prev = all_rows[-1] if all_rows else None
    if prev is not None and prev[0] is None and prev[2] is None:
        prev[0] = seq
        prev[2] = biz
        if prev[3] is None:
            prev[3] = item
        prev[6] = _STRADDLE_FLAG
    else:
        all_rows.append([seq, current_county, biz, item, batch, date, _STRADDLE_FLAG])


def extract_downstream_rows(pdf_path):
    """逐頁抽取 1150716 改版後的下游業者清單，回傳統一 7 欄的 rows:
    [序號, 縣市, 業者, 品項, 批號, 有效日期, 抽取旗標] (順序對齊 clean_downstream_list
    的輸入；抽取旗標只在跨頁列重組時有值，其餘為 None)。

    縣市是跨很多業者的大合併儲存格，extract_tables() 大多抓不回來 (詳見模組 docstring)，
    這裡改用幾何位置還原: 表格左緣 _COUNTY_STRIP_WIDTH 內的非數字文字視為縣市標籤，
    其頂端 y 座標落在哪一列的 bbox 內、縣市就從那一列開始生效，之後 forward fill
    (含跨頁)。標籤若沒落在任何列的 bbox 內 (例如剛好壓在格線上)，退而取起點最接近的
    那一列，不會默默丟掉。
    """
    all_rows = []
    current_county = None
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.find_tables():
                grid = table.extract()
                if not grid:
                    continue
                n_cols = len(grid[0])

                strip_right = table.bbox[0] + _COUNTY_STRIP_WIDTH
                county_at_row = {}
                for word in page.extract_words():
                    text = word["text"].strip()
                    if word["x1"] > strip_right or not text:
                        continue
                    if text.isdigit() or text in ("縣市", "序號"):
                        continue
                    row_idx = None
                    for i, table_row in enumerate(table.rows):
                        if table_row.bbox[1] <= word["top"] < table_row.bbox[3]:
                            row_idx = i
                            break
                    if row_idx is None and table.rows:
                        row_idx = min(
                            range(len(table.rows)),
                            key=lambda i: abs(table.rows[i].bbox[1] - word["top"]),
                        )
                    if row_idx is not None:
                        county_at_row[row_idx] = text

                orphan_values = _orphan_row_values(page, table, n_cols)
                if orphan_values is not None:
                    _patch_straddling_row(all_rows, orphan_values, n_cols, current_county)

                for i, cells in enumerate(grid):
                    if i in county_at_row:
                        current_county = county_at_row[i]
                    if all(v is None for v in cells):
                        continue
                    if len(cells) == 6:
                        # 縣市欄在表格範圍內的頁面: 第 0 欄是縣市 (大多為 None，
                        # 就算有值也已由上面的幾何比對涵蓋)，丟棄改用 current_county
                        _, seq, biz, item, batch, date = cells
                    elif len(cells) == 5:
                        # 縣市欄落在表格範圍外的頁面
                        seq, biz, item, batch, date = cells
                    else:
                        print(f"警告: 跳過無法辨識的 {len(cells)} 欄列: {cells}")
                        continue
                    if [seq, biz, item, batch, date] == HEADER_1[1:]:
                        continue
                    all_rows.append([seq, current_county, biz, item, batch, date, None])
    return all_rows


# 台灣 22 個縣市的正式全名 (6 直轄市 + 3 市 + 13 縣)
TAIWAN_COUNTIES = [
    "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市",
    "基隆市", "新竹市", "嘉義市",
    "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義縣",
    "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣",
]

# 少數縣市在來源 PDF 常用「台」而非正式的「臺」，正規化時統一用正式全名，
# 但只有「台」/「臺」都存在對應全名時才轉換 (新竹市/新竹縣沒有台/臺之分，不受影響)。
_COUNTY_ALIASES = {name.replace("臺", "台"): name for name in TAIWAN_COUNTIES if "臺" in name}
_COUNTY_ALIASES.update({name: name for name in TAIWAN_COUNTIES})

# 2014 年縣市改制升格：舊制縣名 -> 現制市名。實測福懋來源 PDF 有「桃園縣」這種舊名殘留。
_LEGACY_COUNTY_RENAMES = {
    "台北縣": "新北市", "臺北縣": "新北市",
    "台中縣": "臺中市", "臺中縣": "臺中市",
    "台南縣": "臺南市", "臺南縣": "臺南市",
    "高雄縣": "高雄市",
    "桃園縣": "桃園市",
}

# 只有「去掉市/縣後綴」不會產生歧義的縣市才能安全補上後綴——新竹市/新竹縣兩個並存的
# 行政區都可能被寫成「新竹」，無法從文字本身判斷是哪一個，所以「新竹」刻意不放進這個表，
# 遇到就保留原文不加後綴，不用猜的。兩種寫法都要收 (台中/臺中 都可能是來源 PDF 的原文)。
_BARE_NAME_TO_FULL = {}
for _name in TAIWAN_COUNTIES:
    if _name[:-1] == "新竹":
        continue
    _BARE_NAME_TO_FULL[_name[:-1]] = _name
    _BARE_NAME_TO_FULL[_name[:-1].replace("臺", "台")] = _name


def normalize_county(raw):
    """把來源 PDF 五花八門的縣市寫法 (台/臺、缺市縣後綴、星號備註、舊制縣名) 統一成
    正式全名。空字串/None 一律保留原樣 (通常代表「零售」或無法歸屬到特定縣市的列，
    不是縣市名稱打錯字，不該被硬塞一個值)。無法判斷指哪個行政區的縣市名 (目前只有
    「新竹」) 也保留原文，不用猜的。
    """
    if not raw:
        return raw
    name = raw.strip().strip("*").strip()
    if not name:
        return raw

    if name in _LEGACY_COUNTY_RENAMES:
        return _LEGACY_COUNTY_RENAMES[name]
    if name in _COUNTY_ALIASES:
        return _COUNTY_ALIASES[name]
    if name in _BARE_NAME_TO_FULL:
        return _BARE_NAME_TO_FULL[name]
    return name


# 批號被來源檔以 Excel 科學記號顯示 (例: 2.02704e+13) 時的備註旗標。
# 科學記號只保留前幾位有效數字，完整批號無法從 PDF 還原，原樣輸出交人工複核。
_SCI_NOTATION_FLAG = "原資料以科學記號紀載，無從判定油品序號"


def _is_sci_notation(batch_value):
    return "e+" in batch_value.lower()


def clean_downstream_list(rows):
    """處理『下游業者清單』(輸入來自 extract_downstream_rows，縣市已逐列補回)，
    回傳展開後的 dict list，並附上待人工複核的旗標。"""
    records = []
    cur_seq = cur_biz = None
    last_item = None

    for row in rows:
        seq, city, biz, item, batch, date, extract_flag = row

        flag = extract_flag or ""

        if seq is not None:
            cur_seq, cur_biz = seq, biz
            if biz is None:
                flag = "業者資料缺失(來源PDF排版異常，請人工複核)"
        elif biz is not None:
            # 序號 None 但業者有值 -> 來源 PDF 排版異常，無法確定序號歸屬
            cur_biz = biz
            flag = "序號資料缺失(來源PDF排版異常，請人工複核)"

        if item is None:
            item = last_item
            flag = flag or "延續前一列品項的批號/日期"

        item_lines = item.split("\n") if item else [""]
        batch_lines = batch.split("\n") if batch else [""]
        date_lines = date.split("\n") if date else [""]
        # n_bd = 這一格實際代表幾筆「批號/日期」；品項欄位有時只是文字太長被換行包住
        # (與批號/日期筆數無關)，要跟真正對應多筆批號/日期的換行分開處理
        n_bd = max(len(batch_lines), len(date_lines))

        normalized_city = normalize_county(city)

        if n_bd > 1 and len(item_lines) == n_bd:
            # 品項、批號、日期都對應同樣筆數 -> 逐筆展開成多列
            item_full = None
            item_of = lambda i: item_lines[i]
        else:
            # 品項是單一名稱 (可能因太長被換行包住，直接接起來)，套用到每筆批號/日期
            item_full = "".join(item_lines)
            item_of = lambda i: item_full

        for i in range(n_bd):
            batch_i = batch_lines[i] if i < len(batch_lines) else batch_lines[-1]
            row_flag = flag
            if batch_i and _is_sci_notation(batch_i):
                row_flag = f"{flag}；{_SCI_NOTATION_FLAG}" if flag else _SCI_NOTATION_FLAG
            records.append({
                "序號": cur_seq, "縣市": normalized_city, "業者": cur_biz,
                "品項": item_of(i),
                "批號": batch_i,
                "有效日期": date_lines[i] if i < len(date_lines) else date_lines[-1],
                "備註": row_flag,
            })

        last_item = item_full if item_full is not None else item_lines[0]

        # 換行造成品項被拆成獨立的一列，但批號/日期其實跟前一列完全重複 -> 屬於幻影列，去除
        if len(records) >= 2 and records[-1] == records[-2]:
            records.pop()

    return records


FUSHOU_HEADER = ["縣市", "業者", "品項", "批號", "有效日期"]


def clean_fushou_downstream(rows):
    """處理『福壽自行揭露下游業者清單』。5 欄 (無序號)，每一列資料已完整，
    不需要 forward fill；每頁重複表頭列直接過濾掉。序號欄位留空，交給
    StagingDownstreamVendor 沿用既有 seq 欄位型別 (String)，發布時不依賴它排序。

    來源 PDF 同一筆「業者-品項-批號-有效日期」常常整列重複出現好幾次 (推測是
    FDA 彙整原始通路明細時沒有先做過 distinct/JOIN 就直接輸出成清單)，實測樣本
    96 列裡只有 36 列是不重複的。這裡以 縣市+業者+品項+批號+有效日期 為 key 去重，
    保留第一次出現的順序，避免同一批油因為原始資料重複而在公開頁面上洗版。
    """
    records = []
    seen = set()
    for row in rows:
        if row == FUSHOU_HEADER:
            continue
        if all(v is None for v in row):
            continue
        city, biz, item, batch, date = row
        city = normalize_county((city or "").replace("\n", ""))
        biz = (biz or "").replace("\n", "")
        item = (item or "").replace("\n", "")
        batch = (batch or "").replace("\n", "")
        date = (date or "").replace("\n", "")

        dedupe_key = (city, biz, item, batch, date)
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        records.append({
            "序號": "",
            "縣市": city,
            "業者": biz,
            "品項": item,
            "批號": batch,
            "有效日期": date,
            "備註": "福壽自行揭露",
        })
    return records


FUMAO_HEADER = ["序號", "縣市", "業者", "品項", "批號", "有效日期"]


def clean_fumao_downstream(rows):
    """處理『福懋自行揭露下游業者清單』。6 欄，跟 downstream_vendors 欄位順序相同，
    但表頭不是每頁都重複 (長表格跨頁時中間頁沒有表頭列)，過濾表頭時不能假設每頁都有。

    兩種來源 PDF 排版缺陷會讓資料不可靠，都只標記不猜測拆分:
      1. 少數列業者/品項欄位因為該列缺少格線，pdfplumber 把兩欄文字併成一格
         (業者欄位吃掉品項欄前半段文字、品項欄變 None)。
      2. 極少數列業者/品項欄位「有」格線，但文字擷取本身跑位，兩欄文字被交錯拼接
         (例如業者欄尾端多出品項欄的字、品項欄變成兩段文字交錯的亂碼)。
         這種列的 None 判斷抓不到，改用「同一批號的品項應該一致」來抓：
         同批號 (批號+有效日期) 底下，跟該組多數列品項文字不同的少數列視為可疑。
    """
    parsed = []
    for row in rows:
        seq, city, biz, item, batch, date = row
        if row == FUMAO_HEADER:
            continue
        if all(v is None for v in row):
            continue
        parsed.append({
            "序號": seq or "",
            "縣市": normalize_county((city or "").replace("\n", "")),
            "業者": (biz or "").replace("\n", ""),
            "品項": (item or "").replace("\n", "") if item is not None else None,
            "批號": (batch or "").replace("\n", ""),
            "有效日期": (date or "").replace("\n", ""),
            "_item_missing": item is None,
        })

    # 同批號多數列的品項文字 (眾數)，用來抓「有格線但文字交錯拼接」的少數異常列
    majority_item_by_batch = {}
    batch_groups = {}
    for r in parsed:
        key = (r["批號"], r["有效日期"])
        batch_groups.setdefault(key, []).append(r["品項"])
    for key, items in batch_groups.items():
        counts = Counter(i for i in items if i)
        if counts:
            majority_item_by_batch[key] = counts.most_common(1)[0][0]

    # 來源 PDF 同一筆「業者-品項-批號-有效日期」常常整列重複出現好幾次 (推測是 FDA
    # 彙整原始通路明細時沒有先做過 distinct/JOIN)，實測樣本 130 列裡只有 97 列不重複
    # (序號本身逐列遞增不重複，但只是流水號，不是有意義的識別欄位，去重時不看它)。
    # 去重 key 不含序號；保留第一次出現的序號/順序。
    records = []
    seen = set()
    for r in parsed:
        flag = "福懋自行揭露"
        if r["_item_missing"]:
            flag += "；業者/品項欄位缺少分隔線，請人工複核並拆分"
        else:
            key = (r["批號"], r["有效日期"])
            majority_item = majority_item_by_batch.get(key)
            if majority_item and r["品項"] != majority_item and len(batch_groups[key]) > 1:
                flag += "；品項文字與同批號其他列不一致，疑似欄位文字交錯拼接，請人工複核"

        item = r["品項"] or ""
        dedupe_key = (r["縣市"], r["業者"], item, r["批號"], r["有效日期"])
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        records.append({
            "序號": r["序號"], "縣市": r["縣市"], "業者": r["業者"], "品項": item,
            "批號": r["批號"], "有效日期": r["有效日期"], "備註": flag,
        })
    return records


TAISHAN_HEADER = [
    "中聯批次", "業者序", "縣市", "業者", "品項", "批號", "有效日期",
    "產品序號", "產品", "產品效期", "產品毛重", "產品淨重",
]


def clean_taishan_downstream(rows):
    """處理『泰山自行揭露下游廠商產品名單』。12 欄，是「廠商-油品-下游二次加工產品」
    三層展開的表 (同一批油可能對應到該廠商好幾個下游產品)，遠比 downstream_vendors
    的 6 欄豐富。依需求只取跟 downstream_vendors 對應的部分:
      業者序 -> 略過 (不對應 downstream_vendors 的序號，序號留空)
      中聯批次 -> 併入備註 (追溯用)
      產品序號/產品/產品效期/產品淨重 -> 略過 (下游二次加工品細節，不在 downstream_vendors 範圍)
      產品毛重 -> 併入備註 (少數列有值，其餘為空字串)
    同一業者序在來源 PDF 通常展開成多列 (每列對應一項下游產品)，但業者/品項/批號/
    有效日期都相同 -> 這裡整批視為單一業者-油品列去重，避免同一批油因為下游產品數量
    而重複出現很多次。
    少數列業者欄位吸收了品項欄文字 (品項變 None)，跟福懋同樣的來源 PDF 缺格線問題，
    一樣標記人工複核、不猜測拆分。
    """
    seen = set()
    records = []
    for row in rows:
        if row == TAISHAN_HEADER:
            continue
        if all(v is None for v in row):
            continue
        (batch_no, _biz_seq, city, biz, item, lot, date,
         _prod_seq, _prod, _prod_expiry, gross_weight, _net_weight) = row

        flag = "泰山自行揭露"
        if batch_no:
            flag += f"（中聯批次：{batch_no}）"
        if item is None:
            flag += "；業者/品項欄位缺少分隔線，請人工複核並拆分"
        if gross_weight:
            flag += f"；產品毛重：{gross_weight}"

        city = normalize_county((city or "").replace("\n", ""))
        biz = (biz or "").replace("\n", "")
        item = (item or "").replace("\n", "")
        lot = (lot or "").replace("\n", "")
        date = (date or "").replace("\n", "")

        dedupe_key = (city, biz, item, lot, date)
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        records.append({
            "序號": "",
            "縣市": city,
            "業者": biz,
            "品項": item,
            "批號": lot,
            "有效日期": date,
            "備註": flag,
        })
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
            "縣市": normalize_county(city),
            "業者": biz,
            "產品序號": prod_seq,
            "產品名稱": (prod_name or "").replace("\n", ""),
            "有效日期": (date or "").replace("\n", ""),
        })
    return records


def write_csv(path, fieldnames, records):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


DOC_TYPES = {
    "downstream_vendors": {
        # 縣市合併儲存格要靠幾何位置還原，不走預設的 extract_raw_tables
        "extractor": extract_downstream_rows,
        "cleaner": clean_downstream_list,
        "fieldnames": ["序號", "縣市", "業者", "品項", "批號", "有效日期", "備註"],
    },
    "recall_products": {
        "cleaner": clean_recall_list,
        "fieldnames": ["業者序號", "縣市", "業者", "產品序號", "產品名稱", "有效日期"],
    },
    "fushou_downstream": {
        "cleaner": clean_fushou_downstream,
        "fieldnames": ["序號", "縣市", "業者", "品項", "批號", "有效日期", "備註"],
    },
    "fumao_downstream": {
        "cleaner": clean_fumao_downstream,
        "fieldnames": ["序號", "縣市", "業者", "品項", "批號", "有效日期", "備註"],
    },
    "taishan_downstream": {
        "cleaner": clean_taishan_downstream,
        "fieldnames": ["序號", "縣市", "業者", "品項", "批號", "有效日期", "備註"],
    },
}

# 這三種廠商自行揭露的來源，輸出欄位跟 downstream_vendors 相同，走同一套 staging 流程
DOWNSTREAM_LIKE_DOC_TYPES = {"downstream_vendors", "fushou_downstream", "fumao_downstream", "taishan_downstream"}


def process(doc_type, input_path, output_path):
    config = DOC_TYPES[doc_type]
    extractor = config.get("extractor", extract_raw_tables)
    rows = extractor(input_path)
    records = config["cleaner"](rows)
    write_csv(output_path, config["fieldnames"], records)
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--doc-type", required=True, choices=sorted(DOC_TYPES),
                         help="來源 PDF 屬於哪一種格式")
    parser.add_argument("--input", required=True, help="來源 PDF 路徑")
    parser.add_argument("--output", required=True, help="輸出 CSV 路徑")
    args = parser.parse_args()

    records = process(args.doc_type, args.input, args.output)

    if args.doc_type in DOWNSTREAM_LIKE_DOC_TYPES:
        flagged = [r for r in records if r["備註"]]
        print(f"{args.doc_type}: {len(records)} 列 (展開後)")
        print(f"  其中備註非空 (含複核旗標/來源標記): {len(flagged)} 列")
    else:
        print(f"預防性下架產品清單: {len(records)} 列")


if __name__ == "__main__":
    main()
