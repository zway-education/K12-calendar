# K12 收費行事曆

K12 覺知素養教育學苑 ・ 收費行事曆 + Google Sheet 雙向同步工具

🌐 **線上版**：https://zway-education.github.io/K12-calendar/

---

## 結構

```
K12-calendar/
├── index.html              ← 主畫面 (打開首頁就是這個)
├── setup/                  ← 雲端同步設定包
│   ├── README_設定步驟.md  ← 部署步驟
│   ├── 1_班別.csv
│   ├── 2_連假.csv
│   ├── 3_規則.csv
│   └── AppsScript_Code.gs
└── README.md               ← 本檔
```

## 5 大功能

1. **班別管理** — 新增/編輯/刪除班別,可設 1~4 期
2. **年度行事曆總表** — 12 月方格,4 類事件 toggle (開課/上課/續班/收費),事件可編輯
3. **每月收費總表** — 含人數、總金額、繳費期限
4. **單班分表預覽** — 對齊現有「行政點名費表」格式
5. **規則與設定** — 可調收費期程、跳過日期、連雲端 Google Sheet

## 雲端同步

詳見 [setup/README_設定步驟.md](setup/README_設定步驟.md)
