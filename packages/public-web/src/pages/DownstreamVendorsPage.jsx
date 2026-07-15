import { useMemo, useState } from "react";
import { DataTable } from "@oil-search/ui";

import SourceNote from "../components/SourceNote";
import { useData, latestPublishedAt } from "../data/DataContext";
import { FDA_LINKS } from "../config";

const COLUMNS = [
  { key: "county", label: "縣市", width: "6em" },
  { key: "vendor", label: "業者" },
  { key: "item", label: "品項" },
  { key: "lotNumber", label: "批號", width: "9em" },
  { key: "expiryDate", label: "有效日期", width: "10em" },
  { key: "note", label: "備註" },
];

export default function DownstreamVendorsPage() {
  const { downstreamVendors, loading } = useData();
  const [county, setCounty] = useState("");
  const [query, setQuery] = useState("");

  const counties = useMemo(
    () => [...new Set(downstreamVendors.map((r) => r.county))],
    [downstreamVendors]
  );

  const keyword = query.trim().toLowerCase();
  const filtered = downstreamVendors.filter(
    (row) =>
      (!county || row.county === county) &&
      (!keyword ||
        [row.vendor, row.item, row.lotNumber].some((v) => v?.toLowerCase().includes(keyword)))
  );

  return (
    <>
      <h1>下游業者清單</h1>
      <p className="page-desc">
        由食藥署及三家廠商(泰山、福懋、福壽)揭露之表單。
        <br/>
        <a href="https://www.fda.gov.tw/tc/siteContent.aspx?sid=13722" target="_blank" > 來源公告(業者自行揭露) </a>
        <a href="https://www.fda.gov.tw/tc/siteList.aspx?sid=13708" > 來源公告(食藥署揭露) </a>
      </p>
      <SourceNote updatedAt={latestPublishedAt(downstreamVendors)} sourceUrl={FDA_LINKS.downstreamAndOils} />

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
          placeholder="輸入業者、品項或批號"
          aria-label="搜尋下游業者"
        />
        <span className="result-count">
          {loading ? "載入中…" : `符合 ${filtered.length.toLocaleString()} / ${downstreamVendors.length.toLocaleString()} 筆`}
        </span>
      </div>

      <DataTable
        columns={COLUMNS}
        data={filtered}
        rowKey="id"
        emptyMessage={
          downstreamVendors.length === 0
            ? "本站尚未發布這份資料"
            : "沒有符合的業者。查不到不代表安全無虞——清單可能尚未更新，請以食藥署公告為準"
        }
      />
    </>
  );
}
