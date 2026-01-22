    // ====== CAPTCHA (less neat) ======
    function randomDigits(n) {
      let out = "";
      for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
      return out;
    }

    function drawCaptcha(code) {
      const ctx = captchaCanvas.getContext("2d");
      const w = captchaCanvas.width, h = captchaCanvas.height;
      ctx.clearRect(0, 0, w, h);

      // background
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(0, 0, w, h);

      // noise lines
      for (let i = 0; i < 7; i++) {
        ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.lineTo(Math.random() * w, Math.random() * h);
        ctx.stroke();
      }

      // digits (draw individually with jitter + rotate)
      const baseX = 16;
      const step = 34;
      for (let i = 0; i < code.length; i++) {
        const ch = code[i];
        const x = baseX + i * step + (Math.random() * 6 - 3);
        const y = h / 2 + (Math.random() * 10 - 5);
        const angle = (Math.random() * 0.5 - 0.25);
        const size = 30 + Math.floor(Math.random() * 8);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.font = `800 ${size}px system-ui, -apple-system, Segoe UI`;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.textBaseline = "middle";
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      }

      // dots
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
    }

    function resetCaptcha() {
      captchaCode = randomDigits(4);
      captchaVerified = false;
      captchaInput.value = "";
      drawCaptcha(captchaCode);
      setInline(captchaVerifyStatus, "尚未驗證", "");
      dbg("CAPTCHA reset");
      refreshSubmitState();
    }