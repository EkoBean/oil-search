import { FDA_LINKS } from "../config";
import { formatDate } from "../data/DataContext";

// 查詢頁頁頭的資料時間＋非官方聲明。updatedAt 是本站發布時間（不是 FDA 資料截至時間），
// 文案刻意寫「本站資料更新於」避免多宣稱。sourceUrl 指向該資料的 FDA 原始公告頁。
export default function SourceNote({ updatedAt, sourceUrl }) {
  return (
    <p className="source-note">
      {updatedAt ? `本站資料更新於 ${formatDate(updatedAt)}。` : "本站尚未發布這份資料。"}
      本站為非官方整理，更新可能有延遲——請以{" "}
      <a href={sourceUrl ?? FDA_LINKS.incidentHome} target="_blank" rel="noopener noreferrer">
        食藥署原始公告
      </a>{" "}
      為準；最新消息請前往{" "}
      <a href={FDA_LINKS.incidentHome} target="_blank" rel="noopener noreferrer">
        中聯油脂案專區
      </a>
      。
    </p>
  );
}
