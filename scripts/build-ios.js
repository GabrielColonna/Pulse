const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "www");
const apiBase = String(process.env.PULSE_API_BASE || "").trim().replace(/\/+$/, "");

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of [
  "index.html",
  "login.html",
  "app.js",
  "login.js",
  "styles.css",
  "manifest.webmanifest"
]) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}

fs.cpSync(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });

const config = [
  `window.__PULSE_API_BASE__ = ${JSON.stringify(apiBase)};`,
  fs.readFileSync(path.join(root, "config.js"), "utf8")
].join("\n");
fs.writeFileSync(path.join(output, "config.js"), config);

console.log(`Built static iOS web assets in www/ (${apiBase ? "absolute API base configured" : "same-origin API base"})`);
