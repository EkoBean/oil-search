"""將 PDF 逐頁轉成 PNG 圖片。

用於「下游流向圖」這類簡報式 PDF——它是流程圖不是表格，不走 extract_pdfs.py
的解析流程，直接整頁轉圖給前端呈現。

用法：
    python render_pdf_pages.py --input <pdf路徑> --output-dir <輸出資料夾> --basename <檔名前綴>

輸出檔名為 <basename>-page-1.png、<basename>-page-2.png…（頁碼從 1 起算），
結束時在 stdout 印出一行 JSON：{"pages": N}，供呼叫端讀取頁數。
"""

import argparse
import json
import sys
from pathlib import Path

import pdfplumber

# 150 dpi 對這種簡報式版面（16:9 投影片）已足夠閱讀小字，檔案大小也還合理
RESOLUTION = 150


def main() -> None:
    parser = argparse.ArgumentParser(description="Render each PDF page to a PNG image.")
    parser.add_argument("--input", required=True, help="來源 PDF 路徑")
    parser.add_argument("--output-dir", required=True, help="PNG 輸出資料夾（不存在會自動建立）")
    parser.add_argument("--basename", required=True, help="輸出檔名前綴，例如上傳時間戳")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.is_file():
        print(f"找不到輸入檔案: {input_path}", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with pdfplumber.open(input_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            image = page.to_image(resolution=RESOLUTION)
            image.save(output_dir / f"{args.basename}-page-{page_number}.png")
        page_count = len(pdf.pages)

    print(json.dumps({"pages": page_count}))


if __name__ == "__main__":
    main()
