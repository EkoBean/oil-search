import { useEffect, useState } from 'react'
import { App, Input, Modal } from 'antd'

import { updateDownstreamVendorNote } from '../../api/admin'

/**
 * 編輯單筆下游業者 staging 列的審核備註（reviewedNote）。
 *
 * @param {object|null} row 正在編輯的 staging 列，null 表示關閉
 * @param {function} onClose 取消編輯
 * @param {function} onSaved 存檔成功，收到後端回傳的更新後資料列
 */
export default function EditNoteModal({ row, onClose, onSaved }) {
  const { message } = App.useApp()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  // 每次換一列編輯時，帶入該列現有的審核備註
  useEffect(() => {
    if (row) setValue(row.reviewedNote ?? '')
  }, [row])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateDownstreamVendorNote(row.id, value)
      message.success('備註已更新')
      onSaved(updated)
    } catch (err) {
      message.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!row}
      title={row ? `編輯審核備註（序號 ${row.seq}．${row.vendor}）` : ''}
      okText="儲存"
      cancelText="取消"
      confirmLoading={saving}
      onOk={handleSave}
      onCancel={onClose}
    >
      <Input.TextArea
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="輸入審核時要補充的備註"
      />
    </Modal>
  )
}
