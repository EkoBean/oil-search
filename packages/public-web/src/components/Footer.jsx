import { FDA_LINKS } from '../config'

export default function Footer() {
    return (
        <footer>
            <p className="footer-disclaimer">
                本站為民間整理之非官方網站，資料來源為衛生福利部食品藥物管理署（食藥署）公開資訊，
                更新可能有延遲，一切以食藥署公告為準。
            </p>
            <p>
                食品安全疑慮請撥食藥署諮詢專線 <a href="tel:1919">1919</a>

            </p>
            <p>
                <a href={FDA_LINKS.incidentHome} target="_blank" rel="noopener noreferrer">
                    食藥署中聯油脂案專區
                </a>
            </p>
            <p>
                本站為個人自費維運（伺服器與工具費用），如果這些資訊對你有幫助，<a href="https://ko-fi.com/babuluckyoctober#">歡迎請我喝杯咖啡 <img className="footer-icon" src="/images/Kofi.png" /></a>
            </p>
        </footer>
    )
}
