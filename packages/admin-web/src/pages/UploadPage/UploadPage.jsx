import { useState } from 'react'
import { Alert, Flex, Typography, Upload } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import Header from '../../component/Header'
import { uploadPdf, uploadFlowChartPdf } from '../../api/admin'

// 手動上傳的來源 PDF；前兩種走解析＋待審核，流向圖逐頁轉圖後直接發布。
// 廠商自行揭露的三份清單（福壽/福懋/泰山）欄位跟下游業者清單相同，解析後併入同一批
// 待審核資料一起審核，備註欄會自動標記「OO自行揭露」方便分辨來源。
const UPLOAD_SECTIONS = [
  {
    key: 'recall_products',
    title: '預防性下架油品 PDF 上傳',
    description: '上傳「預防性下架產品清單」PDF，系統會自動解析並送入待審核。',
    fdaUrl: 'https://www.fda.gov.tw/tc/site.aspx?sid=13707&r=1865165911',
    upload: (file) => uploadPdf('recall_products', file),
    successMessage: (file) => `「${file.name}」上傳成功，已送入解析與待審核流程`,
  },
  {
    key: 'downstream_vendors',
    title: '下游廠商 PDF 上傳',
    description: '上傳「下游業者清單」PDF，系統會自動解析並送入待審核。',
    fdaUrl: 'https://www.fda.gov.tw/tc/siteList.aspx?sid=13708',
    upload: (file) => uploadPdf('downstream_vendors', file),
    successMessage: (file) => `「${file.name}」上傳成功，已送入解析與待審核流程`,
  },
  {
    key: 'fushou_downstream',
    title: '福壽自行揭露下游業者清單 PDF 上傳',
    description: '上傳福壽自行揭露的下游業者清單 PDF，系統會自動解析、備註標記「福壽自行揭露」並送入待審核（跟下游廠商清單合併審核）。',
    fdaUrl: 'https://www.fda.gov.tw/tc/siteList.aspx?sid=13708',
    upload: (file) => uploadPdf('fushou_downstream', file),
    successMessage: (file) => `「${file.name}」上傳成功，已送入解析與待審核流程`,
  },
  {
    key: 'fumao_downstream',
    title: '福懋自行揭露下游業者清單 PDF 上傳',
    description: '上傳福懋自行揭露的下游業者清單 PDF，系統會自動解析、備註標記「福懋自行揭露」並送入待審核（跟下游廠商清單合併審核）。',
    fdaUrl: 'https://www.fda.gov.tw/tc/siteList.aspx?sid=13708',
    upload: (file) => uploadPdf('fumao_downstream', file),
    successMessage: (file) => `「${file.name}」上傳成功，已送入解析與待審核流程`,
  },
  {
    key: 'taishan_downstream',
    title: '泰山自行揭露下游業者清單 PDF 上傳',
    description: '上傳泰山自行揭露的下游廠商產品名單 PDF，系統會自動解析、備註標記「泰山自行揭露」並送入待審核（跟下游廠商清單合併審核）。',
    fdaUrl: 'https://www.fda.gov.tw/tc/siteList.aspx?sid=13708',
    upload: (file) => uploadPdf('taishan_downstream', file),
    successMessage: (file) => `「${file.name}」上傳成功，已送入解析與待審核流程`,
  },
  {
    key: 'flow_chart',
    title: '下游流向圖 PDF 上傳',
    description: '上傳「下游流向圖」PDF，系統會將每頁轉成圖片並直接發布到公開站（不經審核）。回收統計數字請另外到首頁管理更新。',
    fdaUrl: 'https://www.fda.gov.tw/tc/site.aspx?sid=13707&r=1865165911',
    upload: (file) => uploadFlowChartPdf(file),
    successMessage: (file, result) => `「${file.name}」已轉出 ${result.pageCount} 頁圖片並發布`,
  },
]

function UploadSection({ title, description, fdaUrl, upload, successMessage }) {
  // status: idle | success | error
  const [status, setStatus] = useState({ state: 'idle', message: '' })

  // 交給 antd Upload 觸發；成功/失敗回報給它，檔案清單才會顯示對應狀態
  const handleRequest = async ({ file, onSuccess, onError }) => {
    setStatus({ state: 'idle', message: '' })
    try {
      const result = await upload(file)
      onSuccess(result)
      setStatus({ state: 'success', message: successMessage(file, result) })
    } catch (err) {
      onError(err)
      setStatus({ state: 'error', message: err.message })
    }
  }

  return (
    <Flex vertical gap="middle" component="section">
      <Flex justify="space-between" align="baseline" gap="middle" wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
        <a href={fdaUrl} target="_blank" rel="noreferrer">FDA 佈告欄</a>
      </Flex>
      <Typography.Text type="secondary">{description}</Typography.Text>
      <Upload.Dragger
        accept="application/pdf"
        maxCount={1}
        customRequest={handleRequest}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">點擊或拖曳 PDF 檔案到這裡上傳</p>
        <p className="ant-upload-hint">僅接受 PDF，單檔上限 20 MB</p>
      </Upload.Dragger>
      {status.state !== 'idle' && (
        <Alert type={status.state} title={status.message} showIcon />
      )}
    </Flex>
  )
}

export default function UploadPage() {
  return (
    <>
      <Header />
      <Flex vertical gap="large" className="page-body" style={{ padding: '24px 28px 48px', textAlign: 'left' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>資料上傳</Typography.Title>
        {UPLOAD_SECTIONS.map(({ key, ...section }) => (
          <UploadSection key={key} {...section} />
        ))}
      </Flex>
    </>
  )
}
