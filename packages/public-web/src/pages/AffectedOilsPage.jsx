import { useState } from "react";

import SourceNote from "../components/SourceNote";
import { useData, latestPublishedAt } from "../data/DataContext";
import { FDA_LINKS } from "../config";

// 受影響油品：有產品照片，用卡片呈現比表格好比對（民眾拿著油罐對圖）
export default function AffectedOilsPage() {
  const { affectedOils, loading } = useData();
  const [query, setQuery] = useState("");

  const keyword = query.trim().toLowerCase();
  const filtered = keyword
    ? affectedOils.filter((row) =>
        [row.brand, row.productName, row.lotNumber].some((v) => v?.toLowerCase().includes(keyword))
      )
    : affectedOils;

  return (
    <>
      <h1>受影響油品查詢</h1>
      <p className="page-desc">
        食藥署公告的受影響油品清單。請比對包裝上的<b>品名與批號</b>——批號相符即屬受影響產品，
        可依<a href="/#return-info">退貨資訊</a>辦理退貨。
      </p>
      <SourceNote updatedAt={latestPublishedAt(affectedOils)} sourceUrl={FDA_LINKS.downstreamAndOils} />

      <div className="filter-bar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入品牌、品名或批號，例如：沙拉油"
          aria-label="搜尋受影響油品"
        />
        <span className="result-count">
          {loading ? "載入中…" : `符合 ${filtered.length} / ${affectedOils.length} 筆`}
        </span>
      </div>

      {!loading && filtered.length === 0 && (
        <p className="empty-hint">
          {affectedOils.length === 0
            ? "本站尚未發布這份資料。"
            : "沒有符合的油品。查不到不代表安全無虞——清單可能尚未更新，請以食藥署公告為準。"}
        </p>
      )}

      <div className="oil-cards">
        {filtered.map((row) => (
          <div key={row.id} className="oil-card">
            {row.productPicPath ? (
              <img src={row.productPicPath} alt={`${row.productName} 產品照片`} loading="lazy" />
            ) : (
              <div className="oil-card-nopic">無圖片</div>
            )}
            <div className="oil-card-body">
              {row.brand && <p className="oil-card-brand">{row.brand}</p>}
              <h3>{row.productName}</h3>
              <p>
                批號 <code>{row.lotNumber}</code>
              </p>
              {row.expiryDate && <p className="oil-card-expiry">有效日期：{row.expiryDate}</p>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
