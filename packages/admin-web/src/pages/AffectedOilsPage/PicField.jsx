import { useState } from 'react'
import { Button, Flex } from 'antd'
import { CloseCircleFilled, PictureOutlined } from '@ant-design/icons'

import PicPickerModal from './PicPickerModal'

/**
 * 表單裡的「油品照片」欄位，接 antd Form.Item 注入的 value/onChange。
 * value 是圖片路徑字串（/media/affected-oils/xxx.jpg）或 null。
 * 點縮圖/按鈕開圖庫 modal 選圖或上傳新圖。
 */
export default function PicField({ value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      {value ? (
        <Flex align="center" gap={4}>
          <img
            src={value}
            alt="油品照片"
            title="點擊更換圖片"
            onClick={() => setPickerOpen(true)}
            style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
          />
          <Button
            type="text"
            size="small"
            icon={<CloseCircleFilled />}
            onClick={() => onChange(null)}
            aria-label="移除圖片"
          />
        </Flex>
      ) : (
        <Button icon={<PictureOutlined />} onClick={() => setPickerOpen(true)}>選圖</Button>
      )}
      <PicPickerModal
        open={pickerOpen}
        current={value}
        onClose={() => setPickerOpen(false)}
        onSelect={(path) => {
          onChange(path)
          setPickerOpen(false)
        }}
      />
    </>
  )
}
