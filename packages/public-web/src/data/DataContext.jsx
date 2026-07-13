import { createContext, useContext, useEffect, useState } from "react";

// 生產環境 server 跑在不同網域，build 時用 VITE_API_BASE 指定（例如 https://xxx.up.railway.app）；
// 沒設就用相對路徑，本機開發時走 vite.config.js 的 proxy
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const ENDPOINTS = {
  affectedOils: `${API_BASE}/api/public/affected-oils`,
  recallProducts: `${API_BASE}/api/public/recall-products`,
  downstreamVendors: `${API_BASE}/api/public/downstream-vendors`,
  recallStats: `${API_BASE}/api/public/recall-stats`,
  flowChart: `${API_BASE}/api/public/flow-chart`,
  news: `${API_BASE}/api/public/news`,
};

const INITIAL = {
  affectedOils: [],
  recallProducts: [],
  downstreamVendors: [],
  recallStats: [],
  flowChart: { updatedAt: null, pages: [] },
  news: [],
  loading: true,
  failed: [], // 抓失敗的 key，頁面上據此顯示「暫時無法載入」而不是整站掛掉
};

const DataContext = createContext(INITIAL);

export function DataProvider({ children }) {
  const [state, setState] = useState(INITIAL);

  useEffect(() => {
    let cancelled = false;
    const entries = Object.entries(ENDPOINTS);
    Promise.allSettled(
      entries.map(([_i, url]) =>
        fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${url} HTTP ${r.status}`))))
      )
    ).then((results) => {
      if (cancelled) return;
      setState((prev) => {
        const next = { ...prev, loading: false, failed: [] };
        results.forEach((result, i) => {
          const [key] = entries[i];
          if (result.status === "fulfilled") next[key] = result.value;
          else next.failed.push(key);
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}

// rows 裡最新的 publishedAt（= 本站發布這批資料的時間，不是 FDA 的資料截至時間）
export function latestPublishedAt(rows) {
  if (!rows?.length) return null;
  return rows.reduce((max, r) => (r.publishedAt > max ? r.publishedAt : max), rows[0].publishedAt);
}

export function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
