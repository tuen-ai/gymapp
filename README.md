# 健身訓練 App（繁體中文）

**線上版本：https://tuen-ai.github.io/gymapp/** （push 後由 GitHub Actions 自動部署）

手機優先嘅健身 Web App / PWA，內置 **1,324 個健身動作**（繁體中文名稱＋教學步驟＋GIF 示範），
支援訓練計劃、訓練紀錄同進度統計。所有資料儲存喺本機瀏覽器（IndexedDB），毋須登入、毋須後端。

動作資料來自開源資料集 [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)。

## 功能

- **動作庫** — 1,324 個動作，按部位／器材篩選，中英文模糊搜尋；每個動作有 GIF 示範、
  目標肌群同繁體中文分步驟教學
- **我的健身房** — 登記你健身房有嘅器材種類；又可以輸入自訂機械名稱並關聯做到嘅動作；
  動作庫一掣過濾「只顯示我健身房做到嘅動作」
- **訓練計劃** — 建立自己嘅菜單（例如推日／拉日／腿日），設定目標組數次數，可排序
- **訓練模式** — 由計劃或空白開始，逐組記錄重量×次數，自動帶入上次數據，
  內置組間休息倒數計時；進行中訓練會保存，刷新頁面唔會丟失
- **紀錄＋統計** — 訓練歷史明細、每週訓練容量、單一動作最大重量／估算 1RM 進步曲線、
  訓練部位分佈
- **PWA** — 可加到手機主畫面，app shell 支援離線

## 技術棧

Vite + React 19 + TypeScript · Tailwind CSS 4 · react-router · Dexie（IndexedDB）· Recharts · vite-plugin-pwa

## 開發

```bash
npm install
npm run dev      # 開發伺服器
npm run build    # TypeScript 檢查 + production build（輸出 dist/）
```

## 資料管線

`public/data/exercises.json` 係由原始資料集生成嘅繁體中文精簡版（已 commit，一般毋須重新生成）：

```bash
node scripts/build-data.mjs          # 重新生成
node scripts/build-data.mjs --report # 顯示翻譯覆蓋率報告
```

管線做嘅嘢：

1. 由 GitHub 下載原始 `exercises.json`（17MB，10 種語言）
2. 簡體中文教學經 [OpenCC](https://github.com/BYVoid/OpenCC)（s2twp）轉做繁體中文
3. 英文動作名稱經健身術語詞彙表（`scripts/glossary.json`，約 600 條）
   最長優先詞組配對翻譯做繁中，特殊名稱用 `scripts/name-overrides.json` 人手修正
4. 部位／器材／肌群枚舉用 `scripts/enum-maps.json` 翻譯
5. 輸出精簡版（約 1MB），動作圖片同 GIF 經 jsDelivr CDN 載入
   （失敗時自動退去 GitHub raw）

## 授權

- 程式碼：MIT
- 動作資料文字：MIT（源自 exercises-dataset）
- 動作圖片同 GIF：© Gym visual — https://gymvisual.com/ ，
  經 exercises-dataset 授權條款轉載，詳見 [NOTICE.md](NOTICE.md)
