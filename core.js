    // ====== DOM ======
    const $ = (id) => document.getElementById(id);

    const form = $("member-form");
    const nameInput = $("name");
    const phoneInput = $("phone");
    const addressInput = $("address");

    const captchaCanvas = $("captchaCanvas");
    const btnCaptchaRefresh = $("btn-captcha-refresh");
    const captchaInput = $("captchaInput");
    const btnCaptchaVerify = $("btn-captcha-verify");
    const captchaVerifyStatus = $("captchaVerifyStatus");

    const btnOtpSend = $("btn-otp-send");
    const otpSendStatus = $("otpSendStatus");
    const otpInput = $("otpInput");
    const btnOtpVerify = $("btn-otp-verify");
    const otpVerifyStatus = $("otpVerifyStatus");

    const btnSubmit = $("btn-submit");
    const statusEl = $("status");
    const debugEl = $("debug");

    // ====== State ======
    let oaid = "";
    let dbName = "";
    let liffReady = false;
    let liffProfile = null;

    let captchaCode = "";
    let captchaVerified = false;

    let otpVerified = false;

    let isBound = false;
    let memberNo = null;
    let bindId = null;

    // ====== Utils ======
    function dbg(line) {
      const t = new Date().toISOString().slice(11, 19); // HH:MM:SS
      debugEl.textContent += `\n[${t}] ${line}`;
      debugEl.scrollTop = debugEl.scrollHeight;
    }

    function setStatus(text, type) {
      statusEl.className = "status" + (type ? " " + type : "");
      statusEl.textContent = text || "";
    }

    function setInline(el, text, type) {
      el.textContent = text;
      // 不搞 fancy pill：只用顏色區分
      if (type === "ok") el.style.color = "#bbf7d0";
      else if (type === "bad") el.style.color = "#fecaca";
      else el.style.color = "var(--muted)";
    }

    function normalizePhone(raw) {
      return String(raw || "").trim().replaceAll(" ", "").replaceAll("-", "");
    }

    function getOaIdFromUrl() {
      const u = new URL(location.href);
      return (u.searchParams.get("oaid") || "").trim();
    }

    function lockAllUI() {
      [nameInput, phoneInput, addressInput, captchaInput, otpInput].forEach(el => el.disabled = true);
      [btnCaptchaRefresh, btnCaptchaVerify, btnOtpSend, btnOtpVerify, btnSubmit].forEach(el => el.disabled = true);
    }

    function dbLooksOk(db) {
      if (!db) return false;
      return !db.includes("查無") && !db.includes("失敗") && !db.includes("未提供");
    }

    function canSubmit() {
      const nameOk = nameInput.value.trim().length > 0;
      const phoneOk = normalizePhone(phoneInput.value).length >= 10; // 先求有
      const liffOk = liffReady && window.liff && liff.isLoggedIn() && liffProfile?.userId;
      const oaOk = !!oaid && dbLooksOk(dbName);
      return !!liffOk && nameOk && phoneOk && captchaVerified && otpVerified && !!checkToken && oaOk && !isBound;
    }

    function refreshSubmitState() {
      btnSubmit.disabled = !canSubmit();
    }

    function autofillNameFromLineProfile() {
      if (!liffProfile?.displayName) return;

      // 如果使用者已輸入，就不要硬覆蓋
      const current = (nameInput.value || "").trim();
      if (current.length > 0) return;

      nameInput.value = liffProfile.displayName.trim();
      dbg(`autofill name <- ${liffProfile.displayName}`);
    }

        // ====== OA lookup ======
    async function lookupDbNameByOaId(oaidValue) {
      if (!oaidValue) {
        dbName = "（未提供 oaid）";
        dbg(`oaid missing -> db_name=${dbName}`);
        return;
      }
      try {
        const url = `${API_BIND}/oa_lookup?oaid=${encodeURIComponent(oaidValue)}`;
        const res = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          dbName = "（查詢失敗）";
          dbg(`oa_lookup failed: HTTP ${res.status} / ${data?.error || "unknown"}`);
          return;
        }

        // 你已改回傳格式：外層 db_name
        dbName = data?.db_name || "（查無對應）";
        dbg(`oa_lookup ok -> oaid=${oaidValue}, db_name=${dbName}`);
      } catch (e) {
        dbName = "（查詢失敗）";
        dbg(`oa_lookup exception: ${e?.message || e}`);
      }
    }

    // ====== is_bind ======
    async function checkIsBindMember(oaidValue, uidValue) {
      const url = `${API_BIND}/is_bind?oaid=${encodeURIComponent(oaidValue)}&uid=${encodeURIComponent(uidValue)}`;
      const res = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) return { ok:false, error:(data?.error || `HTTP ${res.status}`) };
      return data;
    }



    // ====== OTP (先求有) ======
    function resetOtp() {
      otpVerified = false;
      otpInput.value = "";
      setInline(otpSendStatus, "尚未發送", "");
      setInline(otpVerifyStatus, "尚未驗證", "");
      refreshSubmitState();
    }



// ====== Address (city/district) ======
const TW_CITY_DISTRICTS = {
  "台北市": ["中正區","大同區","中山區","松山區","大安區","萬華區","信義區","士林區","北投區","內湖區","南港區","文山區"],
  "新北市": ["板橋區","三重區","中和區","永和區","新莊區","新店區","土城區","蘆洲區","汐止區","樹林區","三峽區","鶯歌區","淡水區","林口區","五股區","泰山區","八里區","深坑區","石碇區","坪林區","三芝區","石門區","金山區","萬里區","瑞芳區","貢寮區","雙溪區","平溪區","烏來區"],
  "桃園市": ["桃園區","中壢區","平鎮區","八德區","楊梅區","蘆竹區","大溪區","龜山區","大園區","觀音區","新屋區","龍潭區","復興區"],
  "台中市": ["中區","東區","南區","西區","北區","北屯區","西屯區","南屯區","太平區","大里區","霧峰區","烏日區","豐原區","后里區","石岡區","東勢區","和平區","新社區","潭子區","大雅區","神岡區","大肚區","沙鹿區","龍井區","梧棲區","清水區","大甲區","外埔區","大安區"],
  "台南市": ["中西區","東區","南區","北區","安平區","安南區","永康區","歸仁區","新化區","左鎮區","玉井區","楠西區","南化區","仁德區","關廟區","龍崎區","官田區","麻豆區","佳里區","西港區","七股區","將軍區","學甲區","北門區","新營區","後壁區","白河區","東山區","六甲區","下營區","柳營區","鹽水區","善化區","大內區","山上區","新市區","安定區"],
  "高雄市": ["新興區","前金區","苓雅區","鹽埕區","鼓山區","旗津區","前鎮區","三民區","楠梓區","小港區","左營區","仁武區","大社區","東沙群島","南沙群島","岡山區","路竹區","阿蓮區","田寮區","燕巢區","橋頭區","梓官區","彌陀區","永安區","湖內區","鳳山區","大寮區","林園區","鳥松區","大樹區","旗山區","美濃區","六龜區","內門區","杉林區","甲仙區","桃源區","那瑪夏區","茂林區"],
  "基隆市": ["仁愛區","信義區","中正區","中山區","安樂區","暖暖區","七堵區"],
  "新竹市": ["東區","北區","香山區"],
  "新竹縣": ["竹北市","竹東鎮","新埔鎮","關西鎮","湖口鄉","新豐鄉","芎林鄉","橫山鄉","北埔鄉","寶山鄉","峨眉鄉","尖石鄉","五峰鄉"],
  "苗栗縣": ["苗栗市","頭份市","竹南鎮","後龍鎮","通霄鎮","苑裡鎮","卓蘭鎮","大湖鄉","公館鄉","銅鑼鄉","南庄鄉","頭屋鄉","三義鄉","西湖鄉","造橋鄉","三灣鄉","獅潭鄉","泰安鄉"],
  "彰化縣": ["彰化市","員林市","和美鎮","鹿港鎮","溪湖鎮","二林鎮","田中鎮","北斗鎮","花壇鄉","芬園鄉","大村鄉","永靖鄉","伸港鄉","線西鄉","福興鄉","秀水鄉","埔心鄉","埔鹽鄉","大城鄉","芳苑鄉","竹塘鄉","社頭鄉","二水鄉","田尾鄉","埤頭鄉","溪州鄉"],
  "南投縣": ["南投市","埔里鎮","草屯鎮","竹山鎮","集集鎮","名間鄉","鹿谷鄉","中寮鄉","魚池鄉","國姓鄉","水里鄉","信義鄉","仁愛鄉"],
  "雲林縣": ["斗六市","斗南鎮","虎尾鎮","西螺鎮","土庫鎮","北港鎮","古坑鄉","大埤鄉","莿桐鄉","林內鄉","二崙鄉","崙背鄉","麥寮鄉","東勢鄉","褒忠鄉","臺西鄉","元長鄉","四湖鄉","口湖鄉","水林鄉"],
  "嘉義市": ["東區","西區"],
  "嘉義縣": ["太保市","朴子市","布袋鎮","大林鎮","民雄鄉","溪口鄉","新港鄉","六腳鄉","東石鄉","義竹鄉","鹿草鄉","水上鄉","中埔鄉","竹崎鄉","梅山鄉","番路鄉","大埔鄉","阿里山鄉"],
  "屏東縣": ["屏東市","潮州鎮","東港鎮","恆春鎮","萬丹鄉","長治鄉","麟洛鄉","九如鄉","里港鄉","鹽埔鄉","高樹鄉","萬巒鄉","內埔鄉","竹田鄉","新埤鄉","枋寮鄉","新園鄉","崁頂鄉","林邊鄉","南州鄉","佳冬鄉","琉球鄉","車城鄉","滿州鄉","枋山鄉","霧臺鄉","瑪家鄉","泰武鄉","來義鄉","春日鄉","獅子鄉","牡丹鄉","三地門鄉"],
  "宜蘭縣": ["宜蘭市","羅東鎮","蘇澳鎮","頭城鎮","礁溪鄉","壯圍鄉","員山鄉","冬山鄉","五結鄉","三星鄉","大同鄉","南澳鄉"],
  "花蓮縣": ["花蓮市","鳳林鎮","玉里鎮","新城鄉","吉安鄉","壽豐鄉","光復鄉","豐濱鄉","瑞穗鄉","富里鄉","秀林鄉","萬榮鄉","卓溪鄉"],
  "台東縣": ["臺東市","成功鎮","關山鎮","卑南鄉","大武鄉","太麻里鄉","東河鄉","長濱鄉","鹿野鄉","池上鄉","綠島鄉","延平鄉","海端鄉","達仁鄉","金峰鄉","蘭嶼鄉"],
  "澎湖縣": ["馬公市","湖西鄉","白沙鄉","西嶼鄉","望安鄉","七美鄉"],
  "金門縣": ["金城鎮","金湖鎮","金沙鎮","金寧鄉","烈嶼鄉","烏坵鄉"],
  "連江縣": ["南竿鄉","北竿鄉","莒光鄉","東引鄉"]
};

const addrCityEl = document.getElementById("addrCity");
const addrDistrictEl = document.getElementById("addrDistrict");
const addressHiddenEl = document.getElementById("address");

function syncAddressHidden() {
  const city = (addrCityEl?.value || "").trim();
  const dist = (addrDistrictEl?.value || "").trim();
  // 先只組到「市/區」，之後要加「路/號」再擴充
  addressHiddenEl.value = [city, dist].filter(Boolean).join("");
}

function initAddressDropdown() {
  if (!addrCityEl || !addrDistrictEl) return;

  // 填入縣市
  const cities = Object.keys(TW_CITY_DISTRICTS);
  cities.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    addrCityEl.appendChild(opt);
  });

  // 縣市改變 → 重建行政區
  addrCityEl.addEventListener("change", () => {
    const city = addrCityEl.value;

    addrDistrictEl.innerHTML = "";
    if (!city) {
      addrDistrictEl.disabled = true;
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "請先選縣市";
      addrDistrictEl.appendChild(opt);
      syncAddressHidden();
      return;
    }

    const dists = TW_CITY_DISTRICTS[city] || [];
    addrDistrictEl.disabled = false;

    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "請選擇行政區";
    addrDistrictEl.appendChild(opt0);

    dists.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      addrDistrictEl.appendChild(opt);
    });

    // city 選完先同步一次
    syncAddressHidden();
  });

  // 行政區改變 → 同步 hidden
  addrDistrictEl.addEventListener("change", () => {
    syncAddressHidden();
  });

  // 初始同步
  syncAddressHidden();
}