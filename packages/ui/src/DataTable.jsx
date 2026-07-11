import './DataTable.css';

/**
 * 通用資料表格。
 *
 * @param {object[]} columns - 欄位定義：{ key, label, width?, render? }
 *   render(row) 可自訂該欄的儲存格內容，未提供時直接顯示 row[key]
 * @param {object[]} data - 資料列
 * @param {string} [rowKey] - 作為 React key 的欄位名（例如 "id"），未提供時退回用 index
 * @param {function} [onRowClick] - 點擊整列時的 callback，收到該列資料
 * @param {string} [emptyMessage] - 沒有資料時顯示的文字
 */
export default function DataTable({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = '目前沒有資料',
}) {
  if (!data || data.length === 0) {
    return <div className="data-table-empty">{emptyMessage}</div>;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={rowKey ? row[rowKey] : index}
              className={onRowClick ? 'data-table-row--clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
