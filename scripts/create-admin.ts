// Creates the first administrator: npm run create-admin -- "Имя" admin@example.com password MALE
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { normalizeLogin } from "../src/lib/forms";

async function main() {
  const [name, login, password, gender = "MALE"] = process.argv.slice(2);
  if (!name || !login || !password || password.length < 8) {
    console.error('Usage: npm run create-admin -- "Имя" <email|phone> <password, 8+ chars> [MALE|FEMALE]');
    process.exit(1);
  }
  if (gender !== "MALE" && gender !== "FEMALE") throw new Error("gender must be MALE or FEMALE");
  const id = normalizeLogin(login);
  if (!id.email && !id.phone) throw new Error("login must be an e-mail or phone");
  const db = new PrismaClient();
  const user = await db.user.create({
    data: { name, gender, ...id, passwordHash: await bcrypt.hash(password, 10), roles: ["ADMIN", "TEACHER"] },
  });
  console.log(`Created admin ${user.name} (${user.id})`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
