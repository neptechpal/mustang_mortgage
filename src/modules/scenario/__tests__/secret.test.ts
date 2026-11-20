// Encrypted API-key storage. Run: npx tsx --test src/modules/scenario/__tests__/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SESSION_SECRET = "test-session-secret-0123456789-abcdefghijklmnop";
delete process.env.SETTINGS_ENCRYPTION_KEY;

test("API key encrypts with AES-GCM, decrypts, and detects tampering / wrong secret", async () => {
  const { encryptSecret, decryptSecret } = await import("../secret");
  const key = "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const s = encryptSecret(key, "tester");
  assert.ok(!JSON.stringify(s).includes("ABCDEFGHIJ"), "ciphertext only");
  assert.equal(s.last4, "6789");
  assert.equal(decryptSecret(s), key);
  assert.notEqual(encryptSecret(key, "t").ct, s.ct, "random IV");
  const bad = { ...s, ct: Buffer.from("x" + Buffer.from(s.ct, "base64").toString("latin1").slice(1), "latin1").toString("base64") };
  assert.throws(() => decryptSecret(bad));
  process.env.SESSION_SECRET = "a-different-session-secret-0123456789-zzzzzzzz";
  assert.throws(() => decryptSecret(s), "rotated secret cannot decrypt");
});
