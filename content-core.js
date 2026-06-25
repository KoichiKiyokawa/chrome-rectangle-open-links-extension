(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.RectangleOpenLinksCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function buildRect(startX, startY, endX, endY) {
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const right = Math.max(startX, endX);
    const bottom = Math.max(startY, endY);
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  function offsetRect(rect, offset) {
    return {
      left: rect.left + offset.x,
      top: rect.top + offset.y,
      width: rect.width,
      height: rect.height,
    };
  }

  function rectCenter(rect) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function collectLinkUrls(links, selectionRect) {
    const seen = new Set();
    const urls = [];
    for (const link of links) {
      if (!link || !link.href || !link.rect) continue;
      if (!/^https?:/i.test(link.href)) continue;
      if (link.rect.width === 0 || link.rect.height === 0) continue;
      const center = rectCenter(link.rect);
      if (
        center.x < selectionRect.left ||
        center.x > selectionRect.right ||
        center.y < selectionRect.top ||
        center.y > selectionRect.bottom
      ) {
        continue;
      }
      if (seen.has(link.href)) continue;
      seen.add(link.href);
      urls.push(link.href);
    }
    return urls;
  }

  return {
    buildRect,
    collectLinkUrls,
    offsetRect,
  };
});
