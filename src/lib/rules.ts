// Pure business rules, kept free of database and framework code so they are easy to test.

export type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "ACCOUNTANT";
export type Gender = "MALE" | "FEMALE";
export type GroupAudience = "MALE" | "FEMALE" | "MIXED";
export type Result = "PASSED" | "FAILED";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Администратор",
  TEACHER: "Устаз",
  STUDENT: "Ученик",
  PARENT: "Родитель",
  ACCOUNTANT: "Бухгалтер",
};

export const AUDIENCE_LABELS: Record<GroupAudience, string> = {
  MALE: "Братья",
  FEMALE: "Сёстры",
  MIXED: "Смешанная",
};

export const ATTENDANCE_LABELS = {
  PRESENT: "Был",
  LATE: "Опоздал",
  ABSENT: "Не был",
  EXCUSED: "Уваж. причина",
} as const;

/** A student may join a group only if the group's audience matches their gender. */
export function audienceAllows(audience: GroupAudience, gender: Gender): boolean {
  return audience === "MIXED" || audience === gender;
}

/** Summary of pass/fail marks: "сдано N из M", ignoring lessons with no mark yet. */
export function resultSummary(results: (Result | null | undefined)[]) {
  const marked = results.filter((r): r is Result => r === "PASSED" || r === "FAILED");
  const passed = marked.filter((r) => r === "PASSED").length;
  return { passed, total: marked.length };
}

export type Viewer = { id: string; roles: Role[] };

/**
 * Who may see a student's journal: the student, their parents, admins,
 * and teachers of a group the student is in.
 */
export function canViewStudent(
  viewer: Viewer,
  studentId: string,
  ctx: { parentIds: string[]; teacherIds: string[] },
): boolean {
  if (viewer.id === studentId) return true;
  if (viewer.roles.includes("ADMIN")) return true;
  if (viewer.roles.includes("PARENT") && ctx.parentIds.includes(viewer.id)) return true;
  if (viewer.roles.includes("TEACHER") && ctx.teacherIds.includes(viewer.id)) return true;
  return false;
}

/** Only the group's own teacher or an admin may edit its lessons and journal. */
export function canEditGroup(viewer: Viewer, groupTeacherId: string | null): boolean {
  if (viewer.roles.includes("ADMIN")) return true;
  return viewer.roles.includes("TEACHER") && groupTeacherId === viewer.id;
}

/** Roles an inviter may hand out. Teachers may invite students and parents only. */
export function canInvite(inviter: Viewer, role: Role): boolean {
  if (inviter.roles.includes("ADMIN")) return true;
  if (inviter.roles.includes("TEACHER")) return role === "STUDENT" || role === "PARENT";
  return false;
}
