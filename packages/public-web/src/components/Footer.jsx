import { FDA_LINKS } from '../config'

export default function Footer() {
    return (
        <footer>
            <p className="footer-disclaimer">
                本站為民間整理之非官方網站，資料來源為衛生福利部食品藥物管理署（食藥署）公開資訊，
                更新可能有延遲，一切以食藥署公告為準。
            </p>
            <ul className="footer-links">
                <li>
                    <a href={FDA_LINKS.incidentHome} target="_blank" rel="noopener noreferrer">
                        食藥署中聯油脂案專區
                    </a>
                </li>
                <li>
                    <a href={FDA_LINKS.downstreamAndOils} target="_blank" rel="noopener noreferrer">
                        下游業者清單與受影響油品（原始公告）
                    </a>
                </li>
                <li>
                    <a href={FDA_LINKS.recallList} target="_blank" rel="noopener noreferrer">
                        稽查及下架回收情形（原始公告）
                    </a>
                </li>
                <li>
                    食品安全疑慮請撥食藥署諮詢專線 <a href="tel:1919">1919</a>
                </li>
            </ul>
        </footer>
    )
}
