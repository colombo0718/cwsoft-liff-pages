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
      return !!liffOk && nameOk && phoneOk && captchaVerified && otpVerified && !!bindToken && oaOk && !isBound;
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