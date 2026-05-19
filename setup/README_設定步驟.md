# K12 收費行事曆 ・ 雲端設定包 v2 (2026-05)

雙向同步：HTML 與 Google Sheet 互通。改 Sheet → HTML 重 fetch；HTML 改完 → 自動推回 Sheet。

---

## v2 變更 (從 v1 升級)

| 變更 | 細節 |
|---|---|
| 班別 sheet 加 `textbookFee` 欄 | 每 20 堂教材費 (智優前期 1000、STEAM-R 0、其他依班型) |
| 規則 sheet 加 3 欄 | `renewalWeekStart`(8) / `renewalWeekEnd`(10) / `textbookFeeEvery`(20) |
| 新增 **重點週** sheet | label / start / end / color (供 banner chip 同步) |
| 連假 sheet 修端午 | 6/10-6/12 → 6/19-6/21 |
| 班別資料 20 筆 | 10 本期 (即將開班/進行中) + 10 前期 (進行中, 帶 `_prev` 後綴) |
| API doGet 回傳加 `highlightWeeks` | + `apiVersion: 'v2'` |
| doPost 加 `saveHighlights` action | saveAll 也會一併寫重點週 |

---

## 一、Google Sheet 建立 (一次性)

1. 進 `https://sheets.google.com` (用 K12 教育帳號)
2. 新增空白試算表，命名 **「K12 收費行事曆_資料源」**
3. 建立 **4 個分頁** (右下角 + 號)，名稱要完全一致：
   - `班別`
   - `連假`
   - `規則`
   - `重點週`
4. 依序把這 4 份 CSV 內容貼進對應分頁 (含表頭)：
   - `1_班別.csv` → 班別分頁
   - `2_連假.csv` → 連假分頁
   - `3_規則.csv` → 規則分頁
   - `4_重點週.csv` → 重點週分頁

> 貼上 CSV 時用 **檔案 → 匯入 → 上傳 → 取代目前的工作表**，或直接 **複製貼上** 後用 **資料 → 將文字分割為欄** (分隔符選逗號)。

---

## 二、Apps Script 部署 (一次性)

1. 在試算表 → **擴充功能 → Apps Script**
2. 把預設的 `Code.gs` 內容全部刪掉，**貼上 `AppsScript_Code.gs` 全文**
3. 左上「無標題的專案」改名 **K12 收費行事曆 API**
4. 點 **儲存** (磁碟 icon 或 Ctrl+S)
5. 點 **部署 → 新增部署作業**
   - 類型：**網頁應用程式**
   - 說明：`K12 fee calendar API v2`
   - 執行身分：**我** (你的 K12 帳號)
   - 存取權：**擁有 Google 帳戶的任何人** ※ 教育版若 admin 鎖了「任何人」就選此項；或改「您網域內的所有人」
6. 按 **部署** → 第一次會要授權，依序允許 (登入 → 進階 → 移至「未驗證的應用程式」)
7. 取得 **網頁應用程式網址**，看起來像：
   ```
   https://script.google.com/a/macros/z-way-edu.com/s/AKfyc.../exec
   ```
   **複製這個網址**

---

## 三、HTML 端接上雲端

1. 開 https://zway-education.github.io/K12-calendar/
2. 切到 **⑤ 規則與設定** tab
3. 在「雲端 API 網址」欄位貼上剛剛複製的網址
4. 按 **儲存網址** → 按 **⬇ 從雲端拉**
5. 看到「✓ 已從 Sheet 同步」就完成

之後你在 HTML 上改任何班別/規則/連假/重點週，會自動推回 Sheet。
你在 Sheet 上改完，HTML 重 fetch (按 ⬇ 從雲端拉) 即可拉回。

---

## 四、API 規格速查

### doGet (讀)
- URL: `<webApp>?callback=<jsonpFn>` (JSONP，繞 CORS)
- 回傳：
  ```json
  {
    "classes":        [ {id, name, weekday, time, teacher, campus, startDate, fee, textbookFee, studentCount, periodCount, memo}, ... ],
    "holidays":       [ "2026-01-01", ... ],
    "rules":          { periodLength, feeDayIndex, renewalDayIndex, renewalWeekStart, renewalWeekEnd, lastIntakeIndex, cutoffIndex, textbookFeeEvery },
    "highlightWeeks": [ {label, start, end, color}, ... ],
    "fetchedAt":      "ISO-8601",
    "apiVersion":     "v2"
  }
  ```

### doPost (寫)
- URL: `<webApp>`
- Headers: `Content-Type: text/plain;charset=utf-8` (避開 CORS 預檢)
- Body:
  ```json
  {
    "action": "saveClasses" | "saveHolidays" | "saveRules" | "saveHighlights" | "saveAll",
    "data": {
      "classes": [...],
      "holidays": [...],
      "rules": {...},
      "highlightWeeks": [...]
    }
  }
  ```

---

## 五、疑難排解

| 症狀 | 處理 |
|---|---|
| HTML 「✗ 連線失敗」 | 檢查 Apps Script 部署存取權是否允許你的帳號 |
| HTML 抓到舊資料 | 在 Sheet 改完, 用 HTML「⬇ 從雲端拉」refetch |
| Sheet 沒同步到新欄 | 確認 Sheet 表頭跟 CSV 一致 (textbookFee/renewalWeekStart 等) |
| 端午顯示 6/10 | localStorage 還有舊 v1 資料, 用 ?reset=1 清掉重載 |
| 重點週分頁是空的 | 從 HTML 端按「⬆ 全部推上去」會自動建立並寫入 |

---

## 六、個資保護

- Sheet 上不要放學生姓名/電話/Email (現有 `studentCount` 只記人數,沒有名單)
- 學生名單請放在獨立 sheet 並嚴格控管權限,**不要連到這個 Apps Script**
