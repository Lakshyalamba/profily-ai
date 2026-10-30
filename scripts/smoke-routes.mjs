import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.PROFILY_TEST_URL || "http://127.0.0.1:3000";
const routes = [
  "/",
  "/create",
  "/profile/demo",
  "/profile/judge",
  "/match?profile=judge",
  "/interview?profile=judge",
  "/profile/private",
  "/publish",
  "/match",
  "/interview?profile=demo",
  "/analytics",
  ...(process.env.PROFILY_PUBLIC_PATH ? [process.env.PROFILY_PUBLIC_PATH] : []),
];
const links = new Set(),
  results = [];
for (const route of routes) {
  const response = await fetch(base + route);
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.ok(!html.includes('href="#"'), `Placeholder link on ${route}`);
  for (const match of html.matchAll(/href="([^"<>]+)"/g)) {
    const href = match[1].replaceAll("&amp;", "&");
    if (href.startsWith("/") && !href.startsWith("//"))
      links.add(href.split("#")[0]);
    if (href.startsWith("#"))
      assert.ok(
        html.includes(`id="${href.slice(1)}"`),
        `Missing anchor ${route}${href}`,
      );
  }
  results.push({ route, status: response.status });
}
for (const link of links) {
  const response = await fetch(base + link);
  await response.body?.cancel();
  assert.ok(response.ok, `${link}: ${response.status}`);
}
const status = await (await fetch(base + "/api/status")).json();
assert.equal(typeof status.geminiConfigured, "boolean");
assert.ok(!JSON.stringify(status).includes("GEMINI_API_KEY"));
await mkdir(".data", { recursive: true });
await writeFile(
  ".data/route-smoke-phase-four.json",
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      routes: results,
      internalLinksAndAssets: links.size,
    },
    null,
    2,
  ),
);
console.log(
  `PASS: ${routes.length} page routes; ${links.size} linked internal routes/assets; no empty href or missing page anchor.`,
);
