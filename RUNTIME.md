# RUNTIME.md — cwsoft-liff-pages

> **這份是什麼**
> 給 [`cwsoft-super-manager`](../cwsoft-super-manager/PROJECT.md) 端 Claude / 維護者看的「執行契約」 — 程式作者主張「我希望被這樣跑」。
>
> super-manager 的 `services.json` 應與本檔同步。**兩邊不一致時以本檔為準**（程式作者最懂自己）。
>
> **什麼時候要改**
> 你動了 cmd / port / health endpoint / 環境變數 / 依賴 / 部署模式任一個，都要同時改本檔。
> 改完可在 MM 會議紀錄帶 `🔧 需 super-manager 同步` tag。

---

## 服務角色

**cwsoft-liff-pages** — CWSoft LINE LIFF 前端頁面集（純靜態 HTML / CSS / JS）。
在 LINE App 內嵌瀏覽器開啟，提供綁定會員 / 門市導覽 / 互動選單等介面。

**完全不在公司主機跑 — 是 Vercel 靜態部署**。push master 自動觸發 Vercel 部署，
約 1 分鐘內線上更新。super-manager 不 spawn 也不監控 process，只該驗證對外 URL 健康。

---

## 執行規格

| 欄位 | 值 |
|---|---|
| service name | `cwsoft-liff-pages` |
| **deployment_mode** | `external` |
| platform | Vercel |
| deploy_url | `https://cwsoft-liff-pages.vercel.app` |
| push_branch | `master` |
| 觸發部署 | `git push origin master` 自動觸發 Vercel build |
| health_type | `http`（外部 URL 是否回 200） |

### deployment_mode 為 external 的意義

- **super-manager 不 spawn / 不監控 process**（process 在 Vercel CDN，不在本機）
- super-manager **未來可顯示**：deploy URL 是否回 200、最後 deploy 時間（從 git log 推）
- 改動只要 push master，Vercel 處理剩下的（不需要手動 deploy）

---

## 環境變數需求

N/A — 純靜態前端，無 server-side 程式。LIFF SDK 跟 Channel ID 寫在 HTML 裡。

---

## 對外路由

線上 URL：`https://cwsoft-liff-pages.vercel.app`

頁面清單：
- `/bind-membership.html` — LIFF 綁定會員入口（呼叫後端 `/otp/*` + `/bind/*`）
- `/store-guide.html` — 門市導覽（呼叫後端 `/bind/branches`）
- `/6-picture-menu.html` — 六宮格選單
- `/Xiaowei.html` — 小葳相關頁面

---

## 依賴關係

- **我呼叫**（從 LIFF 前端 fetch）：
  - `https://cwsoft.leaflune.org/otp/*` → cwsoft-sqlgate 的 otp-server (4001)
  - `https://cwsoft.leaflune.org/bind/*` → cwsoft-sqlgate 的 bind-server (4002)
- **被誰呼叫**：客戶在 LINE App 內點 LIFF 連結進來

---

## 變更紀錄

- 2026-04-27：門市圖片更新（`store1~7.jpg` 換成零壹通訊行版本）+ LINE 圖文選單換深色版
- 早期：建立各 LIFF 頁面、Vercel 部署設定

---

## 已知 quirk / 開發注意事項

- ⚠️ 改前端寫死的 API URL（`cwsoft.leaflune.org/...`）時，要對應 cwsoft-sqlgate 的 `bind_server.py` / `OTP_server.py` CORS 白名單（`vercel.app` + `develop.leaflune.org`）
- 客戶 LINE App 開 LIFF 時走 LINE 的 in-app browser，行為跟桌面 Chrome 略不同（特別是 `liff.init()` 時序）
- 6-picture-menu.html 的圖片很大，Vercel CDN 自動 cache 但首次載入慢
- LINE OA Manager 設的 Rich Menu 跟透過 Messaging API 設的是**完全獨立兩套系統** — 4/27 試圖用 API 設預設 menu 失敗（帳號方案限制），最終 OA Manager 手動換圖
