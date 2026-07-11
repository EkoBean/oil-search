import { useEffect, useState } from 'react'
import { Alert, App, Button, Flex, Modal, Popconfirm, Table } from 'antd'

import { fetchStaging, publishStaging } from '../../api/admin'
import EditNoteModal from './EditNoteModal'
import SeqSearch from './SeqSearch'

// 兩種 staging 表單的欄位定義；downstream_vendors 的「編輯備註」操作欄
// 需要拿到 setEditingRow，所以在 component 內另外附加
const DOC_CONFIGS = {
  recall_products: {
    title: '預防性下架油品審核',
    columns: [
      { title: '業者序號', dataIndex: 'vendorSeq', width: 90 },
      { title: '縣市', dataIndex: 'county', width: 90 },
      { title: '業者', dataIndex: 'vendor' },
      { title: '產品序號', dataIndex: 'productSeq', width: 90 },
      { title: '產品名稱', dataIndex: 'productName' },
      { title: '有效日期', dataIndex: 'expiryDate', width: 130 },
    ],
  },
  downstream_vendors: {
    title: '下游廠商審核',
    columns: [
      { title: '序號', dataIndex: 'seq', width: 70 },
      { title: '縣市', dataIndex: 'county', width: 90 },
      { title: '業者', dataIndex: 'vendor' },
      { title: '品項', dataIndex: 'item' },
      { title: '批號', dataIndex: 'lotNumber', width: 110 },
      { title: '有效日期', dataIndex: 'expiryDate', width: 130 },
      { title: '解析備註', dataIndex: 'note', ellipsis: true },
      { title: '審核備註', dataIndex: 'reviewedNote', ellipsis: true },
    ],
  },
}

/**
 * 審核用 modal：打開時抓對應 docType 的 staging 資料，
 * 發佈按鈕固定在 modal footer，不跟著表格滾動。
 *
 * @param {string|null} docType 'recall_products' | 'downstream_vendors'，null 表示關閉
 * @param {function} onClose 關閉 modal（母頁面會順便重抓摘要）
 */
export default function ReviewModal({ docType, onClose }) {
  const { message } = App.useApp()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [editingRow, setEditingRow] = useState(null) // downstream 專用：正在編輯備註的列
  const [seqKeyword, setSeqKeyword] = useState('') // downstream 專用：序號搜尋（只影響顯示，不影響發佈）

  const config = docType ? DOC_CONFIGS[docType] : null

  useEffect(() => {
    if (!docType) return
    setRows([])
    setError('')
    setSeqKeyword('')
    setLoading(true)
    fetchStaging(docType)
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [docType])

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const { published } = await publishStaging(docType)
      message.success(`已發佈 ${published} 筆資料`)
      onClose()
    } catch (err) {
      message.error(err.message)
    } finally {
      setPublishing(false)
    }
  }

  // 單筆備註存檔成功後：更新表格內那一列，不用整批重抓
  const handleNoteSaved = (updated) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setEditingRow(null)
  }

  const columns =
    docType === 'downstream_vendors'
      ? [
          ...config.columns,
          {
            title: '',  // 備註按鈕欄位，為視覺化，title選擇空字串
            key: 'action',
            width: 100,
            render: (_, row) => (
              <Button size="small" onClick={() => setEditingRow(row)}>編輯備註</Button>
            ),
          },
        ]
      : config?.columns ?? []

  // 序號搜尋只在 downstream 生效；用「包含」比對，輸入任意片段就列出所有含該片段的序號
  const trimmedKeyword = seqKeyword.trim()
  const visibleRows =
    docType === 'downstream_vendors' && trimmedKeyword !== ''
      ? rows.filter((r) => r.seq.includes(trimmedKeyword))
      : rows

  return (
    <Modal
      open={!!docType}
      title={config?.title}
      width={1000}
      centered
      onCancel={onClose}
      footer={
        <Flex justify="flex-end" gap="small">
          <Button onClick={onClose}>取消</Button>
          <Popconfirm
            title="發佈後將覆蓋現有已公開資料，確定發佈？"
            okText="發佈"
            cancelText="再想想"
            onConfirm={handlePublish}
          >
            <Button type="primary" loading={publishing} disabled={loading || !!error || rows.length === 0}>
              確認無誤，發佈
            </Button>
          </Popconfirm>
        </Flex>
      }
    >
      {error ? (
        <Alert type="error" title={`載入失敗：${error}`} showIcon />
      ) : (
        <>
          {docType === 'downstream_vendors' && (
            <SeqSearch
              value={seqKeyword}
              onChange={setSeqKeyword}
              matched={visibleRows.length}
              total={rows.length}
            />
          )}
          <Table
            rowKey="id"
            size="medium"
            columns={columns}
            dataSource={visibleRows}
            loading={loading}
            pagination={false}
            scroll={{ y: 'calc(95vh - 280px)' }}
          />
        </>
      )}
      <EditNoteModal row={editingRow} onClose={() => setEditingRow(null)} onSaved={handleNoteSaved} />
    </Modal>
  )
}
