import { useEffect, useState } from 'react'
import { App, AutoComplete, Button, DatePicker, Flex, Form, Input, Spin, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import Header from '../../component/Header'
import { fetchPublishedAffectedOils, publishAffectedOils } from '../../api/admin'
import PicField from './PicField'
import ConfirmPublishModal from './ConfirmPublishModal'

// 這次事件涉及的三家油廠，下拉直接帶出；欄位仍可自由輸入其他品牌
const BRAND_OPTIONS = [
  { value: '福壽實業股份有限公司' },
  { value: '福懋油脂股份有限公司' },
  { value: '泰山企業股份有限公司' },
]

// 品牌欄位：下拉帶三家公司、也能自由輸入。antd v6 淘汰了 AutoComplete 的
// filterOption，所以用目前輸入值自己過濾選項（value/onChange 由 Form.Item 注入）
function BrandAutoComplete(props) {
  const keyword = props.value?.trim() ?? ''
  const options = BRAND_OPTIONS.filter((o) => keyword === '' || o.value.includes(keyword))
  return <AutoComplete {...props} options={options} placeholder="品牌（選填）" allowClear />
}

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
  const [publishing, setPublishing] = useState(false)
  // 表單初始值；null 表示還在載入（Form 尚未渲染，所以不能用 setFieldsValue 塞值，
  // 要等 Form 掛載時用 initialValues 一次帶入，否則 antd 會警告 form 沒接到 Form 元素）
  const [initialOils, setInitialOils] = useState(null)
  // 確認 modal 要顯示的整批資料；null 表示 modal 關閉
  const [pendingOils, setPendingOils] = useState(null)

  // 發佈是整批覆蓋，所以表單從「目前已發佈的清單」出發，而不是空白重填
  useEffect(() => {
    fetchPublishedAffectedOils()
      .then((rows) => {
        setInitialOils(rows.length > 0 ? rows.map(rowToFormValue) : [{}])
      })
      .catch((err) => {
        message.error(`載入現有資料失敗：${err.message}`)
        setInitialOils([{}])
      })
  }, [message])

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

        {initialOils === null ? (
          <Spin />
        ) : (
          <Form form={form} initialValues={{ oils: initialOils }} onFinish={handleSubmit} autoComplete="off">
            <Form.List name="oils">
              {(fields, { add, remove }) => (
                <Flex vertical gap="small">
                  {fields.map(({ key, name }) => (
                    <Flex key={key} gap="small" align="start" wrap>
                      <Form.Item name={[name, 'productPicPath']} style={{ marginBottom: 8 }}>
                        <PicField />
                      </Form.Item>
                      <Form.Item name={[name, 'brand']} style={{ marginBottom: 8, width: 200 }}>
                        <BrandAutoComplete />
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
