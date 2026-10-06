/* =========================================================
   build-single.js — assembles the whole site into ONE file:
   marketpro.html (inline CSS + JS + <template> pages, hash router)
   Run:  node build-single.js
   ========================================================= */
const fs = require("fs");

const read = (f) => fs.readFileSync(f, "utf8");

/* ---------- link rewrite rules (multi-page → hash routes) ---------- */
const LINK_RULES = [
  ["../assets/", "assets/"],
  ["product.html?id=", "#/product?id="],
  ["seller.html?name=", "#/seller?name="],
  ["seller.html?seller=", "#/seller?seller="],
  ["seller.html", "#/seller"],
  ["wallet.html?tab=", "#/wallet?tab="],
  ["add-product.html", "#/add-product"],
  ["my-products.html", "#/my-products"],
  ["transactions.html", "#/transactions"],
  ["orders.html", "#/orders"],
  ["profile.html", "#/profile"],
  ["wallet.html", "#/wallet"],
  ["dashboard.html", "#/dashboard"],
  ["admin.html", "#/admin"],
  ["index.html", "#/"],
  ["new URLSearchParams(location.search)", "new URLSearchParams(Router.queryStr())"],
  ["location.reload(); // refresh shell + fields", "Router.rerender();"],
  ["location.reload();", "Router.rerender();"]
];

function rewrite(s) {
  for (const [from, to] of LINK_RULES) {
    let i = 0;
    let out = "";
    while (true) {
      const j = s.indexOf(from, i);
      if (j < 0) {
        out += s.slice(i);
        break;
      }
      out += s.slice(i, j) + to;
      i = j + from.length;
    }
    s = out;
  }
  return s;
}

/* ---------- CSS ---------- */
const css = read("css/style.css");

/* ---------- JS core ---------- */
let core = read("js/app.js");
// drop the multi-page layout shell IIFE (single-file uses router.js shell)
{
  const idx = core.indexOf("// Layout shell");
  if (idx > 0) {
    const blockStart = core.lastIndexOf("// ====", idx);
    core = core.slice(0, blockStart > 0 ? blockStart : idx);
  } else {
    const altIdx = core.indexOf("(function renderShell()");
    if (altIdx > 0) {
      core = core.slice(0, altIdx);
    }
  }
}
const firebaseCfg = read("js/firebase-config.js");
const api = read("js/api.js");
const router = read("js/single/router.js");
core = rewrite(core);

/* ---------- page scripts: IIFE → named init functions ---------- */
const PAGES = [
  { file: "js/pages/home.js",          fn: "initHome",          route: "home" },
  { file: "js/pages/product.js",       fn: "initProduct",       route: "product" },
  { file: "js/pages/dashboard.js",     fn: "initDashboard",     route: "dashboard" },
  { file: "js/pages/add-product.js",   fn: "initAddProduct",    route: "add-product" },
  { file: "js/pages/my-products.js",   fn: "initMyProducts",    route: "my-products" },
  { file: "js/pages/orders.js",        fn: "initOrders",        route: "orders" },
  { file: "js/pages/wallet.js",        fn: "initWallet",        route: "wallet" },
  { file: "js/pages/transactions.js",  fn: "initTransactions",  route: "transactions" },
  { file: "js/pages/profile.js",       fn: "initProfile",       route: "profile" },
  { file: "js/pages/seller.js",        fn: "initSeller",        route: "seller" },
  { file: "js/pages/admin.js",         fn: "initAdmin",         route: "admin" }
];

let pagesJS = "";
for (const p of PAGES) {
  let src = rewrite(read(p.file));
  const open = src.indexOf("(function () {");
  if (open < 0) throw new Error("IIFE start not found in " + p.file);
  src = src.slice(0, open) + `function ${p.fn}() {` + src.slice(open + "(function () {".length);
  const close = src.lastIndexOf("})();");
  if (close < 0) throw new Error("IIFE end not found in " + p.file);
  src = src.slice(0, close) + "}" + src.slice(close + "})();".length);
  pagesJS += `\n/* ---------- ${p.file} ---------- */\n${src}\nRouter.INIT["${p.route}"] = ${p.fn};\n`;
}

// stat cards without href shouldn't jump to home
pagesJS = pagesJS.replace('href="${s.href || "#"}"', 'href="${s.href || "javascript:void(0)"}"');

/* ---------- page HTML templates ---------- */
const TPLS = [
  ["tpl-home", "index.html"],
  ["tpl-product", "product.html"],
  ["tpl-dashboard", "dashboard.html"],
  ["tpl-add", "add-product.html"],
  ["tpl-myproducts", "my-products.html"],
  ["tpl-orders", "orders.html"],
  ["tpl-wallet", "wallet.html"],
  ["tpl-transactions", "transactions.html"],
  ["tpl-profile", "profile.html"],
  ["tpl-seller", "seller.html"],
  ["tpl-admin", "admin/index.html"]
];

let templates = "";
for (const [id, file] of TPLS) {
  const html = read(file);
  const m = html.match(/<div class="page"[\s\S]*?<\/div>\s*(?=<script)/);
  if (!m) throw new Error("page block not found in " + file);
  let block = m[0].trim().replace(/<\/div>\s*$/, "</div>"); // keep single closing div
  block = rewrite(block)
    .replace(/href="#catalog"/g, 'data-scroll="catalog"')
    .replace(/href="#"/g, 'href="javascript:void(0)"');
  templates += `\n<template id="${id}">\n${block}\n</template>\n`;
}

/* ---------- assemble ---------- */
const out = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RTN BACKUP GROUP — Meta AI Buy & Sell Marketplace</title>
  <meta name="description" content="Official RTN Backup Group Platform. Buy & Sell Meta AI Accounts, Bulk Logs & Digital Assets.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="icon" type="image/png" href="assets/meta-ai-logo.png">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#ff1e42">
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
  <style>
${css}
  </style>
</head>
<body>

  <div class="app">
    <div class="backdrop" id="backdrop"></div>
    <aside class="sidebar" id="sidebar"></aside>
    <div class="main">
      <header class="header" id="header"></header>
      <!-- active page is injected here by the router -->
      <footer class="footer">
        <span>© 2026 RTN BACKUP GROUP — Official Meta AI Buy & Sell Platform. Designer: Ratan Majumder.</span>
        <div class="f-links">
          <a href="#/wallet?tab=deposit">Deposit (Min ৳50)</a>
          <a href="#/add-product">Sell Meta</a>
          <a href="https://wa.me/8801609166109" target="_blank">Admin WhatsApp</a>
        </div>
      </footer>
    </div>
  </div>
${templates}
  <script>
${firebaseCfg}
  </script>
  <script>
${api}
  </script>
  <script>
${core}
  </script>
  <script>
${router}
  </script>
  <script>
${pagesJS}
  </script>
</body>
</html>
`;

/* ---------- inline assets to data URIs for bulletproof deployment ---------- */
const path = require("path");
let finalOut = out;
if (fs.existsSync("assets")) {
  const assetFiles = fs.readdirSync("assets");
  for (const file of assetFiles) {
    const filePath = path.join("assets", file);
    const ext = path.extname(file).toLowerCase();
    const mime = ext === ".svg" ? "image/svg+xml" : ext === ".png" ? "image/png" : "application/octet-stream";
    const base64 = fs.readFileSync(filePath).toString("base64");
    const dataUri = `data:${mime};base64,${base64}`;
    finalOut = finalOut.split(`assets/${file}`).join(dataUri);
    finalOut = finalOut.split(`../assets/${file}`).join(dataUri);
  }
}

fs.writeFileSync("marketpro.html", finalOut);
fs.writeFileSync("index.html", finalOut);
console.log("OK → Generated standalone marketpro.html & index.html (" + finalOut.split("\n").length + " lines, " + (finalOut.length / 1024).toFixed(1) + " KB)");
