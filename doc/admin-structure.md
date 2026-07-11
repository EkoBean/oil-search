packages/admin-web/src/
├── main.jsx
├── App.jsx              # 只放 Router 和 Layout
├── api/
│   └── admin.js         # 所有 fetch 呼叫集中在這（getStaging, publish, upload...）
├── pages/               # 一個 route 一個資料夾
│   ├── UploadPage/      # 手動上傳 downstream_venters recall_products 的頁面
│   │   └── UploadPage.jsx
│   ├── StagingPage/     # 上傳後的待審核頁面（一頁兩列，各開一個審核 modal）
│   │   ├── StagingPage.jsx       # 審核頁面
│   │   ├── ReviewModal.jsx       # 審核表單
│   │   └── EditNoteModal.jsx     # downstream 專用 編輯備註
│   └── AffectedOilsPage/
│       ├── AffectedOilsPage.jsx  # 動態列表單，送出前先開確認 modal，確認才 publish（整批覆蓋）
│       ├── PicField.jsx          # 表單裡的照片欄位（縮圖 + 開圖庫）
│       ├── PicPickerModal.jsx    # 圖庫 modal：勾選既有照片或當場上傳
│       └── ConfirmPublishModal.jsx # 發佈前最後確認的表格預覽
└── components/          # 跨頁共用的才放這裡
    ├── Layout.jsx       # 側邊欄/導覽列
    ├── Modal.jsx        # 通用 modal 外殼（backdrop + close 邏輯）
    └── DataTable.jsx    # 如果兩個審核頁的表格長得像，抽到這
