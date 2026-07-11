import { useEffect, useState } from 'react'
import { App, Button, DatePicker, Flex, Form, Input, Spin, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import Header from '../../component/Header'
import { fetchPublishedAffectedOils, publishAffectedOils } from '../../api/admin'
import PicField from './PicField'
import ConfirmPublishModal from './ConfirmPublishModal'

const DATE_FORMAT = 'YYYY.MM.DD'
// 資料都落在 2027–2028 年，日曆打開直接跳到 2027 年開始選
const PICKER_START = dayjs('2027-01-01')

// 後端已發佈資料列 -> 表單值（expiryDate 轉成 DatePicker 用的 dayjs）
function rowToFormValue(row) {
  return {
    brand: row.brand ?? '',
    productPicPath: row.productPicPath ?? null,
    productName: row.productName,
    lotNumber: row.lotNumber,
    expiryDate: row.expiryDate ? dayjs(row.expiryDate, DATE_FORMAT) : null,
  }
}

export default function AffectedOilsPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  // 確認 modal 要顯示的整批資料；null 表示 modal 關閉
  const [pendingOils, setPendingOils] = useState(null)

  // 發佈是整批覆蓋，所以表單從「目前已發佈的清單」出發，而不是空白重填
  useEffect(() => {
    fetchPublishedAffectedOils()
      .then((rows) => {
        form.setFieldsValue({ oils: rows.length > 0 ? rows.map(rowToFormValue) : [{}] })
      })
      .catch((err) => {
        message.error(`載入現有資料失敗：${err.message}`)
        form.setFieldsValue({ oils: [{}] })
      })
      .finally(() => setLoading(false))
  }, [form, message])

  // 驗證通過後先開確認 modal，按下確認才真的發佈
  const handleSubmit = (values) => {
    const oils = values.oils.map((row) => ({
      brand: row.brand?.trim() || null,
      productPicPath: row.productPicPath || null,
      productName: row.productName.trim(),
      lotNumber: row.lotNumber.trim(),
      expiryDate: row.expiryDate.format(DATE_FORMAT),
    }))
    setPendingOils(oils)
  }

  const handleConfirmPublish = async () => {
    setPublishing(true)
    try {
      const { published } = await publishAffectedOils(pendingOils)
      message.success(`已發佈 ${published} 筆受影響油品`)
      setPendingOils(null)
    } catch (err) {
      message.error(err.message)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <>
      <Header />
      <Flex vertical gap="large" className="page-body" style={{ padding: '24px 28px 48px', textAlign: 'left' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>受影響油品編輯</Typography.Title>
        <Typography.Text type="secondary">
          此清單不經過審核流程，按下發佈後會直接覆蓋公開站上的整份受影響油品資料。
        </Typography.Text>

        {loading ? (
          <Spin />
        ) : (
          <Form form={form} onFinish={handleSubmit} autoComplete="off">
            <Form.List name="oils">
              {(fields, { add, remove }) => (
                <Flex vertical gap="small">
                  {fields.map(({ key, name }) => (
                    <Flex key={key} gap="small" align="start" wrap>
                      <Form.Item name={[name, 'productPicPath']} style={{ marginBottom: 8 }}>
                        <PicField />
                      </Form.Item>
                      <Form.Item name={[name, 'brand']} style={{ marginBottom: 8, width: 130 }}>
                        <Input placeholder="品牌（選填）" />
                      </Form.Item>
                      <Form.Item
                        name={[name, 'productName']}
                        rules={[{ required: true, whitespace: true, message: '請輸入產品名稱' }]}
                        style={{ marginBottom: 8, flex: 1, minWidth: 180 }}
                      >
                        <Input placeholder="產品名稱" />
                      </Form.Item>
                      <Form.Item
                        name={[name, 'lotNumber']}
                        rules={[
                          { required: true, message: '請輸入批號' },
                          { pattern: /^[0-9a-zA-Z]+$/, message: '批號只能是英數字' },
                        ]}
                        style={{ marginBottom: 8, width: 150 }}
                      >
                        <Input placeholder="批號（英數字）" inputMode="numeric" />
                      </Form.Item>
                      <Form.Item
                        name={[name, 'expiryDate']}
                        rules={[{ required: true, message: '請選擇有效日期' }]}
                        style={{ marginBottom: 8, width: 160 }}
                      >
                        <DatePicker
                          format={DATE_FORMAT}
                          placeholder="有效日期"
                          defaultPickerValue={PICKER_START}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                        disabled={fields.length === 1}
                        aria-label="刪除這筆"
                      />
                    </Flex>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})} block>
                    新增一筆油品
                  </Button>
                </Flex>
              )}
            </Form.List>

            <Flex justify="flex-end" style={{ marginTop: 24 }}>
              <Button type="primary" htmlType="submit" size="large">
                送出並預覽發佈內容
              </Button>
            </Flex>
          </Form>
        )}
      </Flex>

      <ConfirmPublishModal
        oils={pendingOils}
        publishing={publishing}
        onCancel={() => setPendingOils(null)}
        onConfirm={handleConfirmPublish}
      />
    </>
  )
}
