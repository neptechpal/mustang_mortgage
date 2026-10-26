// Local-only visual check for admin screens.
// Usage: node scripts/admin-shot.mjs <baseUrl> <path> <out.png> [width=1440]
// Mints a short-lived ADMIN session for local user id 1 using the LOCAL
// SESSION_SECRET from .env and screenshots the page with system Chrome.
import fs from "fs";
import { SignJWT } from "jose";
import puppeteer from "puppeteer-core";

const [base, path, out, width = "1440"] = process.argv.slice(2);
if (!base?.startsWith("http://localhost") && !base?.startsWith("http://127.0.0.1")) {
  console.error("admin-shot only runs against localhost");
  process.exit(1);
}
const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const token = await new SignJWT({ uid: 1, role: "ADMIN", name: "Sulove Admin" })
  .setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(new TextEncoder().encode(env.SESSION_SECRET));
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: Number(width), height: 900, deviceScaleFactor: 1 });
const u = new URL(base);
await page.setCookie({ name: "mm_session", value: token, domain: u.hostname, path: "/" });
const res = await page.goto(base + path, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: out, fullPage: true });
console.log(res?.status(), out);
await browser.close();
