import { Alert, Button, Flex, Modal, Table } from 'antd'

const COLUMNS = [
  {
    title: '圖片',
    dataIndex: 'productPicPath',
    width: 64,
    render: (path) =>
      path ? (
        <img src={path} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
      ) : null,
  },
  { title: '品牌', dataIndex: 'brand', width: 120, render: (v) => v ?? '—' },
  { title: '產品名稱', dataIndex: 'productName' },
  { title: '批號', dataIndex: 'lotNumber', width: 130 },
  { title: '有效日期', dataIndex: 'expiryDate', width: 120 },
]

/**
 * 發佈前的最後確認：把整批要發佈的內容列成表格再看一次，
 * 按下「確認發佈」才真的打 /publish/affected-oils。
 *
 * @param {object[]|null} oils 待發佈資料，null 表示 modal 關閉
 * @param {boolean} publishing 發佈請求進行中
 * @param {function} onCancel 返回修改
 * @param {function} onConfirm 確認發佈
 */
export default function ConfirmPublishModal({ oils, publishing, onCancel, onConfirm }) {
  return (
    <Modal
      open={!!oils}
      title="確認發佈內容"
      width={760}
      centered
      onCancel={onCancel}
      footer={
        <Flex justify="flex-end" gap="small">
          <Button onClick={onCancel}>返回修改</Button>
          <Button type="primary" loading={publishing} onClick={onConfirm}>
            確認發佈 {oils?.length ?? 0} 筆
          </Button>
        </Flex>
      }
    >
      <Flex vertical gap="middle">
        <Alert type="warning" title="發佈後會直接覆蓋公開站上的整份受影響油品清單。" showIcon />
        <Table
          rowKey={(_, index) => index}
          size="small"
          columns={COLUMNS}
          dataSource={oils ?? []}
          pagination={false}
          scroll={{ y: 'calc(80vh - 300px)' }}
        />
      </Flex>
    </Modal>
  )
}
