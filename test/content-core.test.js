const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRect,
  collectLinkUrls,
  offsetRect,
} = require("../content-core");

test("buildRect normalizes drag coordinates", () => {
  assert.deepEqual(buildRect(120, 80, 40, 150), {
    left: 40,
    top: 80,
    right: 120,
    bottom: 150,
    width: 80,
    height: 70,
  });
});

test("collectLinkUrls selects links whose center is inside the rectangle", () => {
  const links = [
    {
      href: "https://example.com/a",
      rect: { left: 10, top: 10, width: 20, height: 20 },
    },
    {
      href: "https://example.com/b",
      rect: { left: 80, top: 80, width: 20, height: 20 },
    },
  ];

  assert.deepEqual(
    collectLinkUrls(links, { left: 0, top: 0, right: 50, bottom: 50 }),
    ["https://example.com/a"],
  );
});

test("collectLinkUrls deduplicates and ignores non-http links", () => {
  const links = [
    {
      href: "https://example.com/a",
      rect: { left: 10, top: 10, width: 20, height: 20 },
    },
    {
      href: "https://example.com/a",
      rect: { left: 12, top: 12, width: 20, height: 20 },
    },
    {
      href: "mailto:test@example.com",
      rect: { left: 14, top: 14, width: 20, height: 20 },
    },
  ];

  assert.deepEqual(
    collectLinkUrls(links, { left: 0, top: 0, right: 50, bottom: 50 }),
    ["https://example.com/a"],
  );
});

test("offsetRect translates iframe-local coordinates to parent coordinates", () => {
  assert.deepEqual(
    offsetRect({ left: 12, top: 8, width: 30, height: 10 }, { x: 100, y: 50 }),
    { left: 112, top: 58, width: 30, height: 10 },
  );
});
