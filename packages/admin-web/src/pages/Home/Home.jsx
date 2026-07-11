import { useEffect, useState } from 'react'
import { App, Button, Empty, Flex, Form, Image, Input, InputNumber, Spin, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'

import Header from '../../component/Header'
import { fetchFlowChart, fetchRecallStats, publishRecallStats } from '../../api/admin'

export default function Home() {
    const { message } = App.useApp()
    const [form] = Form.useForm()
    const [publishing, setPublishing] = useState(false)
    // null 表示還在載入（同 AffectedOilsPage：等載完才 render Form，用 initialValues 一次帶入）
    const [initialStats, setInitialStats] = useState(null)
    // 流向圖頁圖；null 表示還在載入
    const [flowChart, setFlowChart] = useState(null)

    useEffect(() => {
        fetchRecallStats()
            .then((rows) => setInitialStats(rows.length > 0 ? rows : [{}]))
            .catch((err) => {
                message.error(`載入回收統計失敗：${err.message}`)
                setInitialStats([{}])
            })
        fetchFlowChart()
            .then(setFlowChart)
            .catch((err) => {
                message.error(`載入流向圖失敗：${err.message}`)
                setFlowChart({ updatedAt: null, pages: [] })
            })
    }, [message])

    // 發布是整批覆蓋：送出目前表單上的所有列
    const handleSubmit = async (values) => {
        setPublishing(true)
        try {
            const { published } = await publishRecallStats(values.stats)
            message.success(`已發佈 ${published} 筆回收統計`)
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

                {/* Section 1：回收統計編輯 */}
                <Flex vertical gap="middle" component="section">
                    <Typography.Title level={2} style={{ margin: 0 }}>回收統計</Typography.Title>
                    <Typography.Text type="secondary">
                        流向圖黃框裡的數字：每個事件一列，發佈後直接覆蓋公開站上的回收統計。
                    </Typography.Text>

                    {initialStats === null ? (
                        <Spin />
                    ) : (
                        <Form form={form} initialValues={{ stats: initialStats }} onFinish={handleSubmit} autoComplete="off">
                            <Form.List name="stats">
                                {(fields, { add, remove }) => (
                                    <Flex vertical gap="small">
                                        {fields.map(({ key, name }) => (
                                            <Flex key={key} gap="small" align="start" wrap>
                                                <Form.Item
                                                    name={[name, 'incident']}
                                                    rules={[{ required: true, whitespace: true, message: '請輸入事件名稱' }]}
                                                    style={{ marginBottom: 8, flex: 1, minWidth: 240 }}
                                                >
                                                    <Input placeholder="事件名稱，例：中聯油脂 油槽315" />
                                                </Form.Item>
                                                <Form.Item
                                                    name={[name, 'asOf']}
                                                    rules={[{ required: true, whitespace: true, message: '請輸入統計截至時間' }]}
                                                    style={{ marginBottom: 8, width: 180 }}
                                                >
                                                    <Input placeholder="截至時間，例：07/11 11 AM" />
                                                </Form.Item>
                                                <Form.Item
                                                    name={[name, 'recalledTonnage']}
                                                    rules={[{ required: true, message: '請輸入回收噸數' }]}
                                                    style={{ marginBottom: 8, width: 180 }}
                                                >
                                                    <InputNumber placeholder="回收噸數" min={0} suffix="公噸" style={{ width: '100%' }} />
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
                                            新增一筆統計
                                        </Button>
                                    </Flex>
                                )}
                            </Form.List>

                            <Flex justify="flex-end" style={{ marginTop: 16 }}>
                                <Button type="primary" htmlType="submit" loading={publishing}>
                                    發佈回收統計
                                </Button>
                            </Flex>
                        </Form>
                    )}
                </Flex>

                {/* Section 2：目前發布中的流向圖頁圖 */}
                <Flex vertical gap="middle" component="section">
                    <Typography.Title level={2} style={{ margin: 0 }}>下游流向圖</Typography.Title>
                    <Typography.Text type="secondary">
                        目前公開站上顯示的流向圖頁面；要更新請到「資料上傳」上傳新版 PDF。
                        {flowChart?.updatedAt && `（最後更新：${new Date(flowChart.updatedAt).toLocaleString('zh-TW')}）`}
                    </Typography.Text>

                    {flowChart === null ? (
                        <Spin />
                    ) : flowChart.pages.length === 0 ? (
                        <Empty description="尚未上傳流向圖" />
                    ) : (
                        <Flex vertical gap="middle" style={{ maxWidth: 960 }}>
                            <Image.PreviewGroup>
                                {flowChart.pages.map((page) => (
                                    <Image key={page.filename} src={page.path} alt={`流向圖第 ${page.page} 頁`} width="100%" />
                                ))}
                            </Image.PreviewGroup>
                        </Flex>
                    )}
                </Flex>

            </Flex>
        </>
    )
}
