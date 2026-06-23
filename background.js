chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "startRectangleSelect" });
  } catch (e) {
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === "openLinks" && Array.isArray(msg.urls)) {
    msg.urls.forEach((url) => {
      chrome.tabs.create({ url, active: false });
    });
    sendResponse({ ok: true, count: msg.urls.length });
  }
  return true;
});
