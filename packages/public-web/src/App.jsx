import { useLayoutEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import BackToHomeBtn from './components/BackToHomeBtn.jsx'
import { DataProvider } from './data/DataContext.jsx'
import Home from './pages/Home/Home.jsx'
import AffectedOilsPage from './pages/AffectedOilsPage.jsx'
import RecallProductsPage from './pages/RecallProductsPage.jsx'
import DownstreamVendorsPage from './pages/DownstreamVendorsPage.jsx'


import './App.css'

// SPA 換頁不會自動回頂端，查詢頁捲到很下面再回首頁會停在半空中。
// 用 useLayoutEffect 在瀏覽器繪製前就捲動，換頁瞬間不會先閃一下舊捲動位置
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <DataProvider>
      <Router>
        <ScrollToTop />
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/affected-oils" element={<AffectedOilsPage />} />
            <Route path="/recall-products" element={<RecallProductsPage />} />
            <Route path="/downstream-vendors" element={<DownstreamVendorsPage />} />
          </Routes>
        </main>
        <BackToHomeBtn />
        <Footer />
      </Router>
    </DataProvider>
    
  )
}

export default App
