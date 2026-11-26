// Demo data for local development. Every account's password is "password123".
import bcrypt from "bcryptjs";
import { PrismaClient, type Gender, type Role } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const mk = (name: string, email: string, gender: Gender, roles: Role[]) =>
    db.user.upsert({ where: { email }, update: {}, create: { name, email, gender, roles, passwordHash } });

  const admin = await mk("Арслан Администратор", "admin@demo.ru", "MALE", ["ADMIN"]);
  const ustaz = await mk("Устаз Ибрагим", "ustaz@demo.ru", "MALE", ["TEACHER"]);
  const ustaza = await mk("Устаза Марьям", "ustaza@demo.ru", "FEMALE", ["TEACHER"]);
  const ali = await mk("Али Хасанов", "ali@demo.ru", "MALE", ["STUDENT"]);
  const umar = await mk("Умар Сафин", "umar@demo.ru", "MALE", ["STUDENT"]);
  const aisha = await mk("Аиша Хасанова", "aisha@demo.ru", "FEMALE", ["STUDENT"]);
  const parent = await mk("Руслан Хасанов", "parent@demo.ru", "MALE", ["PARENT"]);
  await mk("Гульнара Бухгалтер", "buh@demo.ru", "FEMALE", ["ACCOUNTANT"]);

  for (const childId of [ali.id, aisha.id]) {
    await db.parentChild.upsert({
      where: { parentId_childId: { parentId: parent.id, childId } },
      update: {},
      create: { parentId: parent.id, childId },
    });
  }

  const madrasa = await db.department.upsert({ where: { name: "Медресе" }, update: {}, create: { name: "Медресе" } });
  const sunday = await db.department.upsert({ where: { name: "Воскресная школа" }, update: {}, create: { name: "Воскресная школа" } });

  const hifz = await db.group.upsert({
    where: { departmentId_name: { departmentId: madrasa.id, name: "Хифз, братья" } },
    update: {},
    create: { name: "Хифз, братья", departmentId: madrasa.id, audience: "MALE", teacherId: ustaz.id },
  });
  const sisters = await db.group.upsert({
    where: { departmentId_name: { departmentId: sunday.id, name: "Основы, сёстры" } },
    update: {},
    create: { name: "Основы, сёстры", departmentId: sunday.id, audience: "FEMALE", teacherId: ustaza.id },
  });
  for (const [groupId, studentId] of [[hifz.id, ali.id], [hifz.id, umar.id], [sisters.id, aisha.id]]) {
    await db.groupMember.upsert({
      where: { groupId_studentId: { groupId, studentId } },
      update: {},
      create: { groupId, studentId },
    });
  }

  if ((await db.lesson.count()) === 0) {
    const day = 24 * 3600 * 1000;
    const at = (daysFromNow: number, hourUtc: number) => {
      const d = new Date(Date.now() + daysFromNow * day);
      d.setUTCHours(hourUtc, 0, 0, 0);
      return d;
    };
    const topics = ["Сура ан-Наба, аяты 1–16", "Сура ан-Наба, аяты 17–40", "Сура ан-Назиат, аяты 1–14"];
    for (let i = 0; i < topics.length; i++) {
      const l = await db.lesson.create({
        data: { groupId: hifz.id, startsAt: at(i - 3, 13), topic: topics[i], location: "Мечеть, класс 2", homework: "Повторить пройденные аяты" },
      });
      await db.lessonRecord.createMany({
        data: [
          { lessonId: l.id, studentId: ali.id, attendance: "PRESENT", result: i === 1 ? "FAILED" : "PASSED", comment: i === 1 ? "Повторить мадд" : null },
          { lessonId: l.id, studentId: umar.id, attendance: i === 2 ? "ABSENT" : "PRESENT", result: i === 2 ? null : "PASSED" },
        ],
      });
    }
    await db.lesson.create({
      data: { groupId: hifz.id, startsAt: at(0, 13), topic: "Сура ан-Назиат, аяты 15–33", onlineUrl: "https://telemost.yandex.ru/", homework: "Выучить аяты 15–26" },
    });
    await db.lesson.create({
      data: { groupId: sisters.id, startsAt: at(1, 11), topic: "Условия намаза", location: "Женская аудитория" },
    });
  }
  console.log("Seeded. Logins: admin@demo.ru, ustaz@demo.ru, ali@demo.ru, parent@demo.ru, buh@demo.ru; password: password123");
  void admin;
}

main().finally(() => db.$disconnect());
