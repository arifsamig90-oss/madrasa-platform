"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { audienceAllows, type Gender } from "@/lib/rules";
import { normalizeLogin, str, type FormState } from "@/lib/forms";

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const id = normalizeLogin(str(fd, "login"));
  const password = str(fd, "password");
  if (!id.email && !id.phone) return { error: "Введите e-mail или телефон" };
  const user = await db.user.findFirst({ where: id.email ? { email: id.email } : { phone: id.phone } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Неверный логин или пароль" };
  }
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

async function loadInvite(token: string) {
  const invite = await db.invite.findUnique({ where: { token }, include: { group: true } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) return null;
  return invite;
}

/** Applies an invite to a user: adds the role, joins the group, links the child. */
async function applyInvite(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  invite: NonNullable<Awaited<ReturnType<typeof loadInvite>>>,
  user: { id: string; gender: Gender; roles: string[] },
) {
  if (invite.group && !audienceAllows(invite.group.audience, user.gender)) {
    throw new Error("Эта группа для " + (invite.group.audience === "MALE" ? "братьев" : "сестёр"));
  }
  // Mark used first, conditionally, so two people can't use one link at the same time.
  const claimed = await tx.invite.updateMany({
    where: { id: invite.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) throw new Error("Приглашение уже использовано");
  if (!user.roles.includes(invite.role)) {
    await tx.user.update({ where: { id: user.id }, data: { roles: { push: invite.role } } });
  }
  if (invite.groupId) {
    await tx.groupMember.upsert({
      where: { groupId_studentId: { groupId: invite.groupId, studentId: user.id } },
      create: { groupId: invite.groupId, studentId: user.id },
      update: {},
    });
  }
  if (invite.childId && invite.childId !== user.id) {
    await tx.parentChild.upsert({
      where: { parentId_childId: { parentId: user.id, childId: invite.childId } },
      create: { parentId: user.id, childId: invite.childId },
      update: {},
    });
  }
}

export async function acceptInvite(token: string, _: FormState, fd: FormData): Promise<FormState> {
  const invite = await loadInvite(token);
  if (!invite) return { error: "Приглашение недействительно или устарело" };

  const current = await getCurrentUser();
  try {
    if (current) {
      await db.$transaction((tx) => applyInvite(tx, invite, current));
      redirect("/");
    }

    const name = str(fd, "name");
    const gender = str(fd, "gender") as Gender;
    const password = str(fd, "password");
    const id = normalizeLogin(str(fd, "login"));
    if (name.length < 2) return { error: "Укажите имя" };
    if (gender !== "MALE" && gender !== "FEMALE") return { error: "Укажите пол" };
    if (!id.email && !id.phone) return { error: "Введите e-mail или телефон" };
    if (password.length < 8) return { error: "Пароль должен быть не короче 8 символов" };
    const exists = await db.user.findFirst({ where: id.email ? { email: id.email } : { phone: id.phone } });
    if (exists) return { error: "Такой пользователь уже есть. Войдите и откройте ссылку ещё раз" };

    const user = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { name, gender, ...id, passwordHash: await bcrypt.hash(password, 10), roles: [] },
      });
      await applyInvite(tx, invite, u);
      return u;
    });
    await createSession(user.id);
  } catch (e) {
    if (e instanceof Error && !("digest" in e)) return { error: e.message };
    throw e; // let redirect() through
  }
  redirect("/");
}
