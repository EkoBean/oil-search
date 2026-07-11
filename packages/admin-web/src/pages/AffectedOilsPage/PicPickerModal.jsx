import { useEffect, useState } from 'react'
import { Alert, App, Button, Empty, Flex, Modal, Spin, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

import { fetchAffectedOilPics, uploadAffectedOilPic } from '../../api/admin'

/**
 * 圖庫 modal：列出已上傳的油品照片供勾選，也可以當場上傳新照片
 * （上傳成功會自動選取新照片）。
 *
 * @param {boolean} open
 * @param {string|null} current 目前欄位已選的圖片路徑，打開時預先反白
 * @param {function} onClose 取消
 * @param {function} onSelect 按下「使用這張」時回傳圖片路徑
 */
export default function PicPickerModal({ open, current, onClose, onSelect }) {
  const { message } = App.useApp()
  const [pics, setPics] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  // 每次打開都重抓圖庫（別的欄位可能剛上傳過新圖）
  useEffect(() => {
    if (!open) return
    setSelected(current ?? null)
    setError('')
    setLoading(true)
    fetchAffectedOilPics()
      .then(setPics)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [open, current])

  // antd Upload 的 customRequest：上傳成功後插到圖庫最前面並自動選取
  const handleUpload = async ({ file, onSuccess, onError }) => {
    try {
      const pic = await uploadAffectedOilPic(file)
      setPics((prev) => [pic, ...prev])
      setSelected(pic.path)
      onSuccess(pic)
      message.success(`「${file.name}」上傳成功`)
    } catch (err) {
      onError(err)
      message.error(err.message)
    }
  }

  return (
    <Modal
      open={open}
      title="選擇油品照片"
      width={640}
      centered
      onCancel={onClose}
      footer={
        <Flex justify="space-between" align="center">
          <Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} customRequest={handleUpload}>
            <Button icon={<UploadOutlined />}>上傳新照片</Button>
          </Upload>
          <Flex gap="small">
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" disabled={!selected} onClick={() => onSelect(selected)}>
              使用這張
            </Button>
          </Flex>
        </Flex>
      }
    >
      {error ? (
        <Alert type="error" title={`圖庫載入失敗：${error}`} showIcon />
      ) : loading ? (
        <Flex justify="center" style={{ padding: 32 }}><Spin /></Flex>
      ) : pics.length === 0 ? (
        <Empty description="圖庫還沒有照片，先從左下角上傳一張" />
      ) : (
        <Flex wrap gap="small" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {pics.map((pic) => (
            <img
              key={pic.path}
              src={pic.path}
              alt={pic.filename}
              title={pic.filename}
              onClick={() => setSelected(pic.path)}
              style={{
                width: 96,
                height: 96,
                objectFit: 'cover',
                borderRadius: 6,
                cursor: 'pointer',
                border: pic.path === selected ? '3px solid var(--accent, #1677ff)' : '3px solid transparent',
              }}
            />
          ))}
        </Flex>
      )}
    </Modal>
  )
}
