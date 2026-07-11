import { Flex, Input, Typography } from 'antd'

/**
 * 下游廠商審核用的序號搜尋框：用「包含」比對，
 * 輸入任意片段就列出所有序號含該片段的列。
 *
 * @param {string} value 目前輸入的序號關鍵字
 * @param {function} onChange 輸入變動 callback，收到新字串
 * @param {number} matched 過濾後符合的列數
 * @param {number} total 全部列數
 */
export default function SeqSearch({ value, onChange, matched, total }) {
  return (
    <Flex align="center" gap="middle" style={{ marginBottom: 12 }}>
      <Input.Search
        allowClear
        placeholder="輸入序號搜尋"
        style={{ maxWidth: 240 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value.trim() !== '' && (
        <Typography.Text type="secondary">符合 {matched} / {total} 筆</Typography.Text>
      )}
    </Flex>
  )
}
