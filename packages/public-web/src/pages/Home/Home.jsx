import { Link } from "react-router-dom";

import Collapse from "../../components/Collapse";
import { useData, latestPublishedAt, formatDate } from "../../data/DataContext";
import { FAQ } from "../../content/faq";
import { RETURN_INFO, RETURN_INFO_NOTE } from "../../content/returnInfo";
import { FDA_LINKS } from "../../config";

function RecallHero() {
  const { recallStats, loading } = useData();
  const total = recallStats.reduce((sum, r) => sum + r.recalledTonnage, 0);

  return (
    <section className="hero">
      <p className="hero-eyebrow">中聯油脂大豆沙拉油 苯駢芘超標事件</p>
      <p className="hero-number">
        {loading ? "—" : total.toLocaleString("zh-TW", { maximumFractionDigits: 3 })}
        <span className="hero-unit"> 公噸</span>
      </p>
      <p className="hero-label">已下架回收</p>
      {recallStats.map((r) => (
        <p key={r.id} className="hero-asof">
          {r.incident}回收 {r.recalledTonnage} 噸｜統計截至 {r.asOf}
        </p>
      ))}
    </section>
  );
}

function EntryCards() {
  const { affectedOils, recallProducts, downstreamVendors, loading } = useData();
  const cards = [
    {
      path: "/affected-oils",
      title: "受影響油品查詢",
      sub: "檢驗超標的油品批號，批號相符請退貨",
      rows: affectedOils,
    },
    {
      path: "/recall-products",
      title: "預防性下架產品",
      sub: "先行下架的產品——不代表檢出超標",
      rows: recallProducts,
    },
    {
      path: "/downstream-vendors",
      title: "下游業者清單",
      sub: "哪些店家、廠商曾進貨受影響油品",
      rows: downstreamVendors,
    },
  ];

  return (
    <section className="entry-cards">
      {cards.map((card) => {
        const updatedAt = formatDate(latestPublishedAt(card.rows));
        return (
          <Link key={card.path} to={card.path} className="entry-card">
            <h2>{card.title}</h2>
            <p className="entry-card-sub">{card.sub}</p>
            <p className="entry-card-meta">
              {loading ? "載入中…" : `${card.rows.length.toLocaleString()} 筆`}
              {updatedAt && `｜本站更新於 ${updatedAt}`}
            </p>
          </Link>
        );
      })}
    </section>
  );
}

function ReturnInfoTable() {
  return (
    <>
      <div className="return-table-wrap">
        <table className="return-table">
          <thead>
            <tr>
              <th>品牌／公司</th>
              <th>退貨專線</th>
              <th>官網／退貨資訊</th>
            </tr>
          </thead>
          <tbody>
            {RETURN_INFO.map((row) => (
              <tr key={row.company}>
                <td>{row.company}</td>
                <td>
                  {row.phone ? (
                    <>
                      <a className="return-phone" href={`tel:${row.phone.replaceAll("-", "")}`}>
                        {row.phone}
                      </a>
                      <span className="return-hours">（{row.hours}）</span>
                    </>
                  ) : (
                    row.phoneNote
                  )}
                </td>
                <td>
                  {row.site ? (
                    <a href={row.site} target="_blank" rel="noopener noreferrer">
                      {row.site.replace("https://www.", "")}
                    </a>
                  ) : (
                    row.siteNote
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="return-note">{RETURN_INFO_NOTE}</p>
      <p className="return-note">
        食品安全相關疑慮，可撥打食藥署食品專線 <a href="tel:1919">1919</a>。
      </p>
      <details className="return-original">
        <summary>查看食藥署原始「退貨資訊」（製圖日期 115.7.6）</summary>
        <img
          src="/images/fda-return-info-0707.jpg"
          alt="食藥署退貨資訊手板：泰山 0800-079-080、福壽 0800-236-699、福懋 0800-888-255，購買商家請洽原通路客服"
          loading="lazy"
        />
      </details>
    </>
  );
}

function NewsSection() {
  const { news, loading, failed } = useData();
  if (!loading && (failed.includes("news") || news.length === 0)) {
    return null; 
  }

  return (
    <section className="news">
      <h2>食藥署中聯油脂案專區新聞</h2>
      <ul className="news-list">
        {news.slice(0, 3).map((item) => (
          <li key={item.url} className="news-item">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <div className="news-date">{item.date}</div>
              {item.title}
            </a>
          </li>
        ))}
      </ul>
      <p className="news-more">
        <a href={FDA_LINKS.news} target="_blank" rel="noopener noreferrer">
          前往食藥署中聯油脂案專區，查看全部新聞 →
        </a>
      </p>
    </section>
  );
}

function FlowChartSection() {
  const { flowChart } = useData();
  if (!flowChart.pages.length) return null;

  return (
    <section className="flow-chart">
      <h2>下游流向圖</h2>
      <p className="source-note">
        受影響油品流向哪些下游業者的整理圖（整理自食藥署公告）。
        {flowChart.updatedAt && `本站更新於 ${formatDate(flowChart.updatedAt)}。`}
      </p>
      {flowChart.pages.map((page) => (
        <img
          key={page.filename}
          src={page.path}
          alt={`下游流向圖第 ${page.page} 頁`}
          loading="lazy"
        />
      ))}
    </section>
  );
}

export default function Home() {
  return (
    <>
      <RecallHero />
      <EntryCards />

      <Collapse title="發生什麼事了？">
        {FAQ.map((item) => (
          <div key={item.q} className="faq-item">
            <h3>{item.q}</h3>
            {item.a}
          </div>
        ))}
      </Collapse>

      <Collapse title="退貨資訊" defaultOpen id="return-info">
        <ReturnInfoTable />
      </Collapse>

      <NewsSection />
      <FlowChartSection />
    </>
  );
}
