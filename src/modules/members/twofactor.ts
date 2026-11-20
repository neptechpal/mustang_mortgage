import { prisma } from "@/lib/db";
import { openText, sealText } from "@/lib/crypto-box";
import { generateTotpSecret } from "@/lib/totp";

/** Binds an encrypted secret to its owner so it cannot be copied between users. */
export const twoFactorAad = (userId: number) => `2fa-secret:${userId}`;

/** Creates (or reuses) the not-yet-confirmed secret for a user who has passed the password step. Never expose as a server action. */
export async function getSetupSecret(userId: number): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.twoFactorSecret && !user.twoFactorEnabled) return openText(user.twoFactorSecret, twoFactorAad(user.id));
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: sealText(secret, twoFactorAad(user.id)), twoFactorEnabled: false, twoFactorBackupCodes: null, twoFactorLastStep: null },
  });
  return secret;
}

/** Switches 2FA off for a user (admin reset). Their trusted devices stop working because the secret changes. */
export async function resetTwoFactor(userId: number) {
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: null, twoFactorLastStep: null } });
}
