// Account recovery from the command line (needs DATABASE_URL).
//   npx tsx scripts/users.ts create-admin <username> <email> [password]   create an administrator (prints the password if generated)
//   npx tsx scripts/users.ts reset-2fa <username>                         switch off two-step sign-in so the user sets it up again
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/wp-password";

const prisma = new PrismaClient();
const [cmd, a, b, c] = process.argv.slice(2);

async function main() {
  if (cmd === "create-admin" && a && b) {
    const password = c || randomBytes(12).toString("base64url");
    const user = await prisma.user.upsert({
      where: { username: a },
      create: { username: a, email: b.toLowerCase(), passwordHash: hashPassword(password), displayName: a, role: "ADMIN", status: "approved" },
      update: { email: b.toLowerCase(), passwordHash: hashPassword(password), role: "ADMIN", status: "approved" },
    });
    console.log(`Administrator "${user.username}" is ready.${c ? "" : `\nPassword: ${password}\nChange it after you first log in.`}\nThey will be asked to set up two-step sign-in at first login.`);
  } else if (cmd === "reset-2fa" && a) {
    const r = await prisma.user.updateMany({ where: { username: a }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: null, twoFactorLastStep: null } });
    console.log(r.count ? `Two-step sign-in reset for "${a}".` : `No user called "${a}".`);
  } else {
    console.log("Usage:\n  npx tsx scripts/users.ts create-admin <username> <email> [password]\n  npx tsx scripts/users.ts reset-2fa <username>");
    process.exitCode = 1;
  }
}

main().finally(() => prisma.$disconnect());
