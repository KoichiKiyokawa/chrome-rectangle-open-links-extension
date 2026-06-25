(() => {
  const core = globalThis.RectangleOpenLinksCore;
  const isTop = window.top === window.self;
  const Z_OVERLAY = "2147483646";
  const Z_UI = "2147483647";
  const COLLECT_TIMEOUT_MS = 700;

  let mode = false;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let overlay = null;
  let box = null;
  let banner = null;
  const pendingCollections = new Map();

  function createFixedDiv(styles) {
    const el = document.createElement("div");
    Object.assign(el.style, styles);
    document.documentElement.appendChild(el);
    return el;
  }

  function setCursor(cursor) {
    document.documentElement.style.cursor = cursor;
    if (document.body) document.body.style.cursor = cursor;
  }

  function enterSelectMode() {
    if (mode) return;
    mode = true;
    setCursor("crosshair");
    if (!isTop) return;

    overlay = createFixedDiv({
      position: "fixed",
      inset: "0",
      zIndex: Z_OVERLAY,
      cursor: "crosshair",
      background: "transparent",
    });
    overlay.addEventListener("mousedown", onMouseDown, true);
    overlay.addEventListener("mousemove", onMouseMove, true);
    overlay.addEventListener("mouseup", onMouseUp, true);

    banner = createFixedDiv({
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
    banner.textContent = "ドラッグで矩形選択 / Esc でキャンセル";
  }

  function exitSelectMode() {
    mode = false;
    dragging = false;
    setCursor("");
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
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
    if (!mode || !isTop) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    box = createFixedDiv({
      position: "fixed",
      left: startX + "px",
      top: startY + "px",
      width: "0px",
      height: "0px",
      background: "rgba(0,120,215,0.2)",
      border: "1px solid rgba(0,120,215,0.9)",
      zIndex: Z_UI,
      pointerEvents: "none",
    });
  }

  function onMouseMove(e) {
    if (!dragging || !box) return;
    const rect = core.buildRect(startX, startY, e.clientX, e.clientY);
    box.style.left = rect.left + "px";
    box.style.top = rect.top + "px";
    box.style.width = rect.width + "px";
    box.style.height = rect.height + "px";
  }

  async function onMouseUp(e) {
    if (!dragging || !box) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = false;
    const selectionRect = core.buildRect(startX, startY, e.clientX, e.clientY);
    exitSelectMode();

    const links = await collectFrameLinks();
    const urls = core.collectLinkUrls(links, selectionRect);
    if (urls.length === 0) {
      flash("リンクが見つかりませんでした");
      return;
    }
    chrome.runtime.sendMessage({ action: "openLinks", urls });
    flash(urls.length + " 件のリンクを開きます");
  }

  function localLinks() {
    return Array.from(document.querySelectorAll("a[href]"), (a) => {
      const rect = a.getBoundingClientRect();
      return {
        href: a.href,
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      };
    });
  }

  function frameOffsetForSource(source) {
    for (const frame of document.querySelectorAll("iframe")) {
      if (frame.contentWindow !== source) continue;
      const rect = frame.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    return null;
  }

  function offsetLinks(links, offset) {
    return links.map((link) => ({
      href: link.href,
      rect: core.offsetRect(link.rect, offset),
    }));
  }

  function collectFrameLinks() {
    const requestId =
      Date.now().toString(36) + Math.random().toString(36).slice(2);
    const childFrames = Array.from(document.querySelectorAll("iframe"));
    if (childFrames.length === 0) return Promise.resolve(localLinks());

    return new Promise((resolve) => {
      const collected = localLinks();
      let remaining = childFrames.length;
      const finish = () => {
        pendingCollections.delete(requestId);
        resolve(collected);
      };
      const timer = setTimeout(finish, COLLECT_TIMEOUT_MS);
      pendingCollections.set(requestId, {
        add(source, links) {
          const offset = frameOffsetForSource(source);
          if (offset) collected.push(...offsetLinks(links, offset));
          remaining -= 1;
          if (remaining === 0) {
            clearTimeout(timer);
            finish();
          }
        },
      });
      for (const frame of childFrames) {
        frame.contentWindow.postMessage(
          { __rectSelectCollectLinks: true, requestId },
          "*",
        );
      }
    });
  }

  async function respondWithLinks(source, requestId) {
    const links = await collectFrameLinks();
    source.postMessage(
      { __rectSelectCollectLinksResult: true, requestId, links },
      "*",
    );
  }

  function flash(msg) {
    const el = createFixedDiv({
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
    el.textContent = msg;
    setTimeout(() => el.remove(), 1500);
  }

  function onKey(e) {
    if (mode && e.key === "Escape") {
      e.preventDefault();
      exitSelectMode();
    }
  }

  function forwardStartToFrames() {
    for (const frame of document.querySelectorAll("iframe")) {
      frame.contentWindow.postMessage({ __rectSelectStart: true }, "*");
    }
  }

  window.addEventListener("message", (e) => {
    if (e.data && e.data.__rectSelectStart) {
      enterSelectMode();
      forwardStartToFrames();
      return;
    }
    if (e.data && e.data.__rectSelectCollectLinks) {
      respondWithLinks(e.source, e.data.requestId);
      return;
    }
    if (e.data && e.data.__rectSelectCollectLinksResult) {
      const pending = pendingCollections.get(e.data.requestId);
      if (pending) pending.add(e.source, e.data.links || []);
    }
  });

  document.addEventListener("keydown", onKey, true);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.action === "startRectangleSelect") {
      enterSelectMode();
      forwardStartToFrames();
    }
  });
})();
