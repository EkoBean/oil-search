import { useMemo, useState } from "react";
import { DataTable } from "@oil-search/ui";

import SourceNote from "../components/SourceNote";
import { useData, latestPublishedAt } from "../data/DataContext";
import { FDA_LINKS } from "../config";

const COLUMNS = [
  { key: "county", label: "縣市", width: "6em" },
  { key: "vendor", label: "業者" },
  { key: "productName", label: "產品名稱" },
  { key: "expiryDate", label: "有效日期", width: "10em" },
];

export default function RecallProductsPage() {
  const { recallProducts, loading } = useData();
  const [county, setCounty] = useState("");
  const [query, setQuery] = useState("");

  const counties = useMemo(
    () => [...new Set(recallProducts.map((r) => r.county))],
    [recallProducts]
  );

  const keyword = query.trim().toLowerCase();
  const filtered = recallProducts.filter(
    (row) =>
      (!county || row.county === county) &&
      (!keyword ||
        [row.vendor, row.productName].some((v) => v?.toLowerCase().includes(keyword)))
  );

  return (
    <>
      <h1>預防性下架產品</h1>
      <p className="page-desc">
        <b>預防性下架是防範措施</b>：這些產品因為可能使用了受影響油品而先行下架，
        <b>不代表檢驗超標</b>。已購買者可依各公司／通路規定退貨。
      </p>
      <SourceNote updatedAt={latestPublishedAt(recallProducts)} sourceUrl={FDA_LINKS.recallList} />

      <div className="filter-bar">
        <select value={county} onChange={(e) => setCounty(e.target.value)} aria-label="以縣市篩選">
          <option value="">全部縣市</option>
          {counties.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入業者或產品名稱"
          aria-label="搜尋預防性下架產品"
        />
        <span className="result-count">
          {loading ? "載入中…" : `符合 ${filtered.length.toLocaleString()} / ${recallProducts.length.toLocaleString()} 筆`}
        </span>
      </div>

      <DataTable
        columns={COLUMNS}
        data={filtered}
        rowKey="id"
        emptyMessage={
          recallProducts.length === 0
            ? "本站尚未發布這份資料"
            : "沒有符合的產品。查不到不代表安全無虞——清單可能尚未更新，請以食藥署公告為準"
        }
      />
    </>
  );
}
