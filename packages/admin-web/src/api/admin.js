const BASE = '/api/admin'

// docType -> 後端 route 片段（staging/publish 共用同一組命名）
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
  return requestJson('/api/public/affected-oils')
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
