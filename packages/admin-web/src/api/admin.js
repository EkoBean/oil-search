// 生產環境 server 跑在不同網域，build 時用 VITE_API_BASE 指定（例如 https://xxx.up.railway.app）；
// 沒設就用相對路徑，本機開發時走 vite.config.js 的 proxy
const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const BASE = `${API_BASE}/api/admin`
const PUBLIC_BASE = `${API_BASE}/api/public`

// docType -> 後端 route 片段（staging/publish 共用同一組命名）
// fushou/fumao/taishan_downstream 上傳後併入同一張 downstream-vendors staging 表一起審核，
// 所以這三種只有上傳用的 docType key，沒有各自的 staging/publish route。
const DOC_TYPE_PATHS = {
  recall_products: 'recall-products',
  downstream_vendors: 'downstream-vendors',
}

async function requestJson(url, options) {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `請求失敗 (HTTP ${res.status})`)
  }
  return data
}

/**
 * 手動上傳來源 PDF，交給後端 extractAndStage（parse -> staging -> 待審核通知）。
 * @param {string} docType 'recall_products' | 'downstream_vendors'
 * @param {File} file 使用者選的 PDF 檔
 * @returns {Promise<object>} 建立的 SourceDocument
 */
export async function uploadPdf(docType, file) {
  const formData = new FormData()
  formData.append('docType', docType)
  formData.append('file', file)

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `上傳失敗 (HTTP ${res.status})`)
  }
  return data
}

/**
 * 取得某 docType 的 staging（待審核）資料列。
 * @param {string} docType 'recall_products' | 'downstream_vendors'
 * @returns {Promise<object[]>}
 */
export async function fetchStaging(docType) {
  return requestJson(`${BASE}/staging/${DOC_TYPE_PATHS[docType]}`)
}

/**
 * @param {string} docType 'recall_products' | 'downstream_vendors'
 * @returns {Promise<{published: number}>}
 */
export async function publishStaging(docType) {
  return requestJson(`${BASE}/publish/${DOC_TYPE_PATHS[docType]}`, { method: 'POST' })
}

/**
 * GET /api/public/affected-oils
 * @returns {Promise<object[]>}
 */
export async function fetchPublishedAffectedOils() {
  return requestJson(`${PUBLIC_BASE}/affected-oils`)
}

/**
 * GET /api/admin/affected-oil-pics
 * @returns {Promise<{filename: string, path: string, uploadedAt: string}[]>}
 */
export async function fetchAffectedOilPics() {
  return requestJson(`${BASE}/affected-oil-pics`)
}

/**
 * POST api/admin/affected-oil-pics
 * @param {File} file JPEG / PNG / WebP 圖片
 * @returns {Promise<{filename: string, path: string}>}
 */
export async function uploadAffectedOilPic(file) {
  const formData = new FormData()
  formData.append('file', file)
  return requestJson(`${BASE}/affected-oil-pics`, { method: 'POST', body: formData })
}

/**
 * POST api/admin/publish/affected-oils
 * @param {object[]} oils { brand?, productPicPath?, productName, lotNumber, expiryDate }
 * @returns {Promise<{published: number}>}
 */
export async function publishAffectedOils(oils) {
  return requestJson(`${BASE}/publish/affected-oils`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oils }),
  })
}

/**
 * POST /api/admin/flow-chart
 * 上傳「下游流向圖」PDF；後端逐頁轉 PNG 後直接發布（不經 staging）。
 * @param {File} file PDF 檔
 * @returns {Promise<{pageCount: number, pages: {filename: string, path: string, page: number}[]}>}
 */
export async function uploadFlowChartPdf(file) {
  const formData = new FormData()
  formData.append('file', file)
  return requestJson(`${BASE}/flow-chart`, { method: 'POST', body: formData })
}

/**
 * GET /api/public/flow-chart
 * @returns {Promise<{updatedAt: string|null, pages: {filename: string, path: string, page: number}[]}>}
 */
export async function fetchFlowChart() {
  return requestJson(`${PUBLIC_BASE}/flow-chart`)
}

/**
 * GET /api/public/recall-stats
 * @returns {Promise<{id: number, incident: string, asOf: string, recalledTonnage: number}[]>}
 */
export async function fetchRecallStats() {
  return requestJson(`${PUBLIC_BASE}/recall-stats`)
}

/**
 * POST /api/admin/publish/recall-stats
 * 整批覆蓋發布回收統計。
 * @param {object[]} stats { incident, asOf, recalledTonnage }
 * @returns {Promise<{published: number}>}
 */
export async function publishRecallStats(stats) {
  return requestJson(`${BASE}/publish/recall-stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stats }),
  })
}

/**
 * PATCH edit note
 * @param {number} id staging 列 id
 * @param {string} reviewedNote 管理員補充的備註
 * @returns {Promise<object>} 更新後的資料列
 */
export async function updateDownstreamVendorNote(id, reviewedNote) {
  return requestJson(`${BASE}/staging/downstream-vendors/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewedNote }),
  })
}
