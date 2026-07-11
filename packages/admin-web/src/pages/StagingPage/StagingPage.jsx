import { useCallback, useEffect, useState } from 'react'
import { Button, Flex, Typography } from 'antd'

import Header from '../../component/Header'
import { fetchStaging } from '../../api/admin'
import ReviewModal from './ReviewModal'

// 兩種待審核的 staging 表單，docType 要對到後端 staging/publish 的 route
const SECTIONS = [
  { docType: 'recall_products', title: '預防性下架油品(recall_products)' },
  { docType: 'downstream_vendors', title: '下游廠商(downstream_vendors)' },
]

// 整批 staging 是同一次匯入建立的，理論上每列 createdAt 都一樣；
// 保險起見取最大值當「這批資料的建立時間」，就算殘留到跨批舊列也會顯示最新一批的時間。
function batchCreatedAt(rows) {
  if (!rows || rows.length === 0) return null
  return rows.reduce((max, r) => (r.createdAt > max ? r.createdAt : max), rows[0].createdAt)
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('zh-TW', { hour12: false })
}

export default function StagingPage() {
  // { [docType]: { rows } | { error } }，只拿來顯示列表列的建立時間/筆數，
  // modal 打開時會自己重抓一次最新資料
  const [summaries, setSummaries] = useState({})
  const [activeDocType, setActiveDocType] = useState(null)

  const loadSummaries = useCallback(async () => {
    const entries = await Promise.all(
      SECTIONS.map(async ({ docType }) => {
        try {
          return [docType, { rows: await fetchStaging(docType) }]
        } catch (err) {
          return [docType, { error: err.message }]
        }
      }),
    )
    setSummaries(Object.fromEntries(entries))
  }, [])

  useEffect(() => {
    loadSummaries()
  }, [loadSummaries])

  // 關 modal 後重抓摘要：發佈成功或備註更新後，列表列顯示的狀態才會跟上
  const handleModalClose = () => {
    setActiveDocType(null)
    loadSummaries()
  }

  return (
    <>
      <Header />
      <Flex vertical gap="large" className="page-body" style={{ padding: '24px 28px 48px', textAlign: 'left' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>資料審核</Typography.Title>
        {SECTIONS.map(({ docType, title }) => {
          const summary = summaries[docType]
          const createdAt = batchCreatedAt(summary?.rows)
          return (
            <Flex key={docType} component="section" justify="space-between" align="center" gap="middle" wrap>
              <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
              <Flex align="center" gap="middle">
                <Typography.Text type="secondary">
                  {summary?.error
                    ? `載入失敗：${summary.error}`
                    : createdAt
                      ? `資料建立時間：${formatTime(createdAt)}（共 ${summary.rows.length} 筆）`
                      : summary
                        ? '目前沒有待審核資料'
                        : '載入中…'}
                </Typography.Text>
                <Button type="primary" disabled={!createdAt} onClick={() => setActiveDocType(docType)}>
                  審核
                </Button>
              </Flex>
            </Flex>
          )
        })}
      </Flex>
      <ReviewModal docType={activeDocType} onClose={handleModalClose} />
    </>
  )
}
