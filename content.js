(() => {
  let mode = false;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let box = null;
  let banner = null;

  const Z_OVERLAY = "2147483646";
  const Z_UI = "2147483647";

  function enterSelectMode() {
    if (mode) return;
    mode = true;
    document.body.style.cursor = "crosshair";
    banner = document.createElement("div");
    banner.textContent = "ドラッグで矩形選択 / Esc でキャンセル";
    Object.assign(banner.style, {
      position: "fixed",
      top: "8px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,0.7)",
      color: "#fff",
      padding: "6px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      fontFamily: "system-ui, sans-serif",
      zIndex: Z_UI,
      pointerEvents: "none",
    });
    document.body.appendChild(banner);
  }

  function exitSelectMode() {
    mode = false;
    dragging = false;
    document.body.style.cursor = "";
    if (box) {
      box.remove();
      box = null;
    }
    if (banner) {
      banner.remove();
      banner = null;
    }
  }

  function onMouseDown(e) {
    if (!mode) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    box = document.createElement("div");
    Object.assign(box.style, {
      position: "fixed",
      left: startX + "px",
      top: startY + "px",
      width: "0px",
      height: "0px",
      background: "rgba(0,120,215,0.2)",
      border: "1px solid rgba(0,120,215,0.9)",
      zIndex: Z_OVERLAY,
      pointerEvents: "none",
    });
    document.body.appendChild(box);
  }

  function onMouseMove(e) {
    if (!dragging || !box) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    box.style.left = x + "px";
    box.style.top = y + "px";
    box.style.width = w + "px";
    box.style.height = h + "px";
  }

  function collectLinks(rect) {
    const links = document.querySelectorAll("a[href]");
    const seen = new Set();
    const urls = [];
    for (const a of links) {
      const r = a.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (
        cx >= rect.left &&
        cx <= rect.right &&
        cy >= rect.top &&
        cy <= rect.bottom
      ) {
        const href = a.href;
        if (!href) continue;
        if (!/^https?:/i.test(href)) continue;
        if (seen.has(href)) continue;
        seen.add(href);
        urls.push(href);
      }
    }
    return urls;
  }

  function flash(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      position: "fixed",
      bottom: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,0.75)",
      color: "#fff",
      padding: "8px 14px",
      borderRadius: "6px",
      fontSize: "12px",
      fontFamily: "system-ui, sans-serif",
      zIndex: Z_UI,
      pointerEvents: "none",
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  function onMouseUp() {
    if (!dragging || !box) return;
    dragging = false;
    const rect = box.getBoundingClientRect();
    const urls = collectLinks(rect);
    box.remove();
    box = null;
    exitSelectMode();
    if (urls.length === 0) {
      flash("リンクが見つかりませんでした");
      return;
    }
    chrome.runtime.sendMessage({ action: "openLinks", urls });
    flash(urls.length + " 件のリンクを開きます");
  }

  function onKey(e) {
    if (mode && e.key === "Escape") {
      e.preventDefault();
      exitSelectMode();
    }
  }

  document.addEventListener("mousedown", onMouseDown, true);
  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("mouseup", onMouseUp, true);
  document.addEventListener("keydown", onKey, true);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.action === "startRectangleSelect") {
      enterSelectMode();
    }
  });
})();
