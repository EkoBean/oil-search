import { Link, useLocation } from "react-router-dom";

// 右下角固定按鈕：查詢頁是「回首頁」的站內連結（Link 走路由，不整頁重載）；
// 在首頁上變成「回頂端」——這是動作不是導航，用 <button> 就完全不會碰到路由。
export default function BackToHomeBtn() {
  const { pathname } = useLocation();

  if (pathname === "/") {
    return (
      <button
        type="button"
        className="back-to-home-btn"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <img src="/images/Up.png" alt="" />
        <p>
          回頂端
        </p>
      </button>
    );
  }

  return (
    <Link to="/" className="back-to-home-btn">
      <img src="/images/Home Page.png" alt="" />
      <p>
        回首頁
      </p>
    </Link>
  );
}
