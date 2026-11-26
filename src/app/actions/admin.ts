"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { audienceAllows, canEditGroup, canInvite, type GroupAudience, type Role } from "@/lib/rules";
import { str } from "@/lib/forms";

const AUDIENCES: GroupAudience[] = ["MALE", "FEMALE", "MIXED"];
const ROLES: Role[] = ["ADMIN", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT"];
const INVITE_DAYS = 14;

export async function createDepartment(fd: FormData) {
  await requireRole("ADMIN");
  const name = str(fd, "name");
  if (!name) throw new Error("Укажите название");
  await db.department.create({ data: { name } });
  revalidatePath("/admin");
}

export async function createGroup(fd: FormData) {
  await requireRole("ADMIN");
  const name = str(fd, "name");
  const departmentId = str(fd, "departmentId");
  const audience = str(fd, "audience") as GroupAudience;
  const teacherId = str(fd, "teacherId") || null;
  if (!name || !departmentId || !AUDIENCES.includes(audience)) throw new Error("Заполните все поля");
  await db.group.create({ data: { name, departmentId, audience, teacherId } });
  revalidatePath("/admin");
}

export async function setGroupTeacher(groupId: string, fd: FormData) {
  await requireRole("ADMIN");
  const teacherId = str(fd, "teacherId") || null;
  if (teacherId) {
    const t = await db.user.findUnique({ where: { id: teacherId } });
    if (!t?.roles.includes("TEACHER")) throw new Error("Это не устаз");
  }
  await db.group.update({ where: { id: groupId }, data: { teacherId } });
  revalidatePath(`/admin/groups/${groupId}`);
}

export async function addStudentToGroup(groupId: string, fd: FormData) {
  await requireRole("ADMIN");
  const studentId = str(fd, "studentId");
  const [group, student] = await Promise.all([
    db.group.findUniqueOrThrow({ where: { id: groupId } }),
    db.user.findUniqueOrThrow({ where: { id: studentId } }),
  ]);
  if (!student.roles.includes("STUDENT")) throw new Error("Это не ученик");
  if (!audienceAllows(group.audience, student.gender)) throw new Error("Группа не подходит по полу");
  await db.groupMember.upsert({
    where: { groupId_studentId: { groupId, studentId } },
    create: { groupId, studentId },
    update: {},
  });
  revalidatePath(`/admin/groups/${groupId}`);
}

export async function removeStudentFromGroup(groupId: string, studentId: string) {
  await requireRole("ADMIN");
  await db.groupMember.deleteMany({ where: { groupId, studentId } });
  revalidatePath(`/admin/groups/${groupId}`);
}

/** Creates a one-time registration link. Teachers may invite into their own groups only. */
export async function createInvite(fd: FormData) {
  const user = await requireUser();
  const role = str(fd, "role") as Role;
  const groupId = str(fd, "groupId") || null;
  const childId = str(fd, "childId") || null;
  if (!ROLES.includes(role) || !canInvite(user, role)) throw new Error("Нет прав на это приглашение");
  if (groupId) {
    const group = await db.group.findUniqueOrThrow({ where: { id: groupId } });
    if (!canEditGroup(user, group.teacherId)) throw new Error("Нет доступа к группе");
  }
  if (childId) {
    const child = await db.user.findUniqueOrThrow({
      where: { id: childId },
      include: { memberships: { include: { group: true } } },
    });
    const teachesChild = child.memberships.some((m) => m.group.teacherId === user.id);
    if (!user.roles.includes("ADMIN") && !teachesChild) throw new Error("Нет доступа к ученику");
  }
  await db.invite.create({
    data: {
      token: randomBytes(18).toString("base64url"),
      role,
      groupId: role === "STUDENT" ? groupId : null,
      childId: role === "PARENT" ? childId : null,
      createdBy: user.id,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 3600 * 1000),
    },
  });
  revalidatePath("/admin/people");
  revalidatePath("/groups/[id]", "page");
}

export async function revokeInvite(id: string) {
  const user = await requireUser();
  const invite = await db.invite.findUniqueOrThrow({ where: { id } });
  if (!user.roles.includes("ADMIN") && invite.createdBy !== user.id) throw new Error("Нет прав");
  await db.invite.delete({ where: { id } });
  revalidatePath("/admin/people");
  revalidatePath("/groups/[id]", "page");
}
