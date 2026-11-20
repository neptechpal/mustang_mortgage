// Small AES-256-GCM helper for secrets stored in the database (2FA secrets).
// The key is derived with HKDF from SETTINGS_ENCRYPTION_KEY (preferred) or SESSION_SECRET.
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

function serverSecret(): string {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY && process.env.SETTINGS_ENCRYPTION_KEY.length >= 32 ? process.env.SETTINGS_ENCRYPTION_KEY : process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) throw new Error("Server encryption secret is missing or too short");
  return raw;
}

function boxKey(label: string): Buffer {
  return Buffer.from(hkdfSync("sha256", serverSecret(), "mustang-mortgage", label, 32));
}

/** Encrypts `plain`; `aad` binds the ciphertext to its purpose (and owner) so it cannot be swapped between rows. */
export function sealText(plain: string, aad: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", boxKey("box-v1"), iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function openText(sealed: string, aad: string): string {
  const [v, iv, tag, ct] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unrecognised sealed value");
  const d = createDecipheriv("aes-256-gcm", boxKey("box-v1"), Buffer.from(iv, "base64url"));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}

/** Keyed hash for short secrets (backup codes, email codes) so a database leak does not reveal them. */
export function keyedHash(value: string, purpose: string): string {
  return createHmac("sha256", boxKey("hash-v1")).update(`${purpose}:${value}`).digest("hex");
}
