// Encrypted secret storage for the Scenario assistant (Anthropic API key).
// AES-256-GCM; the encryption key is derived with HKDF from SETTINGS_ENCRYPTION_KEY (preferred) or
// SESSION_SECRET, so the database alone never reveals the API key. The plaintext is never returned to
// the browser, logged or written to activity — the admin page only sees the last 4 characters.
// NOTE: rotating the server secret makes a stored key unreadable; the page then asks for it again.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const SETTING_KEY = "scenario.secret.anthropic";

type Stored = { v: 1; kid: "settings" | "session"; iv: string; tag: string; ct: string; last4: string; setBy: string; setAt: string };
export type KeyStatus =
  | { source: "settings"; last4: string; setBy: string; setAt: string; readable: boolean }
  | { source: "env"; last4: string }
  | { source: "none" };

function masterKey(kid: Stored["kid"]): Buffer {
  const raw = kid === "settings" ? process.env.SETTINGS_ENCRYPTION_KEY : process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) throw new Error("Server encryption secret is missing or too short");
  return Buffer.from(hkdfSync("sha256", raw, "mustang-mortgage", "scenario-settings-secret-v1", 32));
}
const currentKid = (): Stored["kid"] => (process.env.SETTINGS_ENCRYPTION_KEY && process.env.SETTINGS_ENCRYPTION_KEY.length >= 32 ? "settings" : "session");

export function encryptSecret(plain: string, setBy: string): Stored {
  const kid = currentKid();
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", masterKey(kid), iv);
  c.setAAD(Buffer.from(SETTING_KEY));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return { v: 1, kid, iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), ct: ct.toString("base64"), last4: plain.slice(-4), setBy, setAt: new Date().toISOString() };
}

export function decryptSecret(s: Stored): string {
  const d = createDecipheriv("aes-256-gcm", masterKey(s.kid), Buffer.from(s.iv, "base64"));
  d.setAAD(Buffer.from(SETTING_KEY));
  d.setAuthTag(Buffer.from(s.tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(s.ct, "base64")), d.final()]).toString("utf8");
}

async function readStored(): Promise<Stored | null> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  const v = row?.value as Stored | undefined;
  return v && v.v === 1 && v.ct ? v : null;
}

export const ANTHROPIC_KEY_RE = /^sk-ant-[A-Za-z0-9_-]{20,250}$/;

export async function saveAnthropicKey(plain: string, setBy: string) {
  const k = plain.trim();
  if (!ANTHROPIC_KEY_RE.test(k)) throw new Error("That doesn't look like an Anthropic API key (it should start with sk-ant-).");
  const enc = encryptSecret(k, setBy);
  await prisma.setting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value: enc }, update: { value: enc } });
}

export async function removeAnthropicKey() {
  await prisma.setting.deleteMany({ where: { key: SETTING_KEY } });
}

/** Key used for AI calls: the encrypted key saved in settings, else the ANTHROPIC_API_KEY env var. */
export async function getAnthropicKey(): Promise<string | null> {
  const s = await readStored();
  if (s) {
    try {
      return decryptSecret(s);
    } catch {
      return null; // unreadable (server secret rotated) — do not silently fall back to a different key
    }
  }
  return process.env.ANTHROPIC_API_KEY || null;
}

export async function anthropicKeyStatus(): Promise<KeyStatus> {
  const s = await readStored();
  if (s) {
    let readable = true;
    try {
      decryptSecret(s);
    } catch {
      readable = false;
    }
    return { source: "settings", last4: s.last4, setBy: s.setBy, setAt: s.setAt, readable };
  }
  const env = process.env.ANTHROPIC_API_KEY;
  return env ? { source: "env", last4: env.slice(-4) } : { source: "none" };
}
