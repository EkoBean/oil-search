// 退貨資訊，逐字轉錄自食藥署「退貨資訊」手板（製圖日期 115.7.6，
// 原圖存於 public/images/fda-return-info-0707.jpg，頁面上也會展示）。
// FDA 更新手板時，記得同步這份資料和 public/images 的原圖。
export const RETURN_INFO = [
  {
    company: "泰山企業股份有限公司",
    phone: "0800-079-080",
    hours: "週一至週五 8:00–17:30",
    site: "https://www.taisun.com.tw",
  },
  {
    company: "福壽實業股份有限公司",
    phone: "0800-236-699",
    hours: "週一至週五 8:00–17:00",
    site: "https://www.fwusow.com.tw",
  },
  {
    company: "福懋油脂股份有限公司",
    phone: "0800-888-255",
    hours: "週一至週五 8:00–17:00",
    site: "https://www.fopco.com.tw",
  },
  {
    company: "購買商家（各大通路）",
    phone: null,
    phoneNote: "請洽原購買商家之客服專線",
    hours: null,
    site: null,
    siteNote: "請逕至原購買商家官網查詢",
  },
];

export const RETURN_INFO_NOTE =
  "退貨條件及作業方式依各公司／通路規定辦理，若有疑問請洽各公司／通路客服；後續賠償由廠商全權負責。";
