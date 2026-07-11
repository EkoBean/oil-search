import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from 'antd'
import zhTW from 'antd/locale/zh_TW'

import UploadPage from './pages/UploadPage/UploadPage.jsx'
import StagingPage from './pages/StagingPage/StagingPage.jsx'
import AffectedOilsPage from './pages/AffectedOilsPage/AffectedOilsPage.jsx'
import Home from './pages/Home/Home.jsx'

function App() {

  return (
    <ConfigProvider locale={zhTW}>
      {/* antd 的 App 提供 message/modal context，讓子元件用 App.useApp() 叫全域提示 */}
      <AntdApp>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/staging" element={<StagingPage />} />
            <Route path="/affected-oils" element={<AffectedOilsPage />} />
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
