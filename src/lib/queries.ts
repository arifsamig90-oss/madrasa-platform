import "server-only";
import { db } from "./db";
import { dayBounds } from "./time";

/** Lessons today and the next 7 days for a student, with their own record. */
export async function studentOverview(studentId: string) {
  const { start } = dayBounds(new Date());
  const weekEnd = new Date(start.getTime() + 8 * 24 * 3600 * 1000);
  const [upcoming, recent] = await Promise.all([
    db.lesson.findMany({
      where: { group: { members: { some: { studentId } } }, startsAt: { gte: start, lt: weekEnd } },
      include: { group: { include: { teacher: { select: { name: true } } } } },
      orderBy: { startsAt: "asc" },
    }),
    db.lessonRecord.findMany({
      where: { studentId, OR: [{ result: { not: null } }, { attendance: { not: null } }] },
      include: { lesson: { include: { group: true } } },
      orderBy: { lesson: { startsAt: "desc" } },
      take: 5,
    }),
  ]);
  return { upcoming, recent };
}

/** Context needed by canViewStudent. */
export async function studentAccessContext(studentId: string) {
  const [parents, groups] = await Promise.all([
    db.parentChild.findMany({ where: { childId: studentId }, select: { parentId: true } }),
    db.group.findMany({ where: { members: { some: { studentId } } }, select: { teacherId: true } }),
  ]);
  return {
    parentIds: parents.map((p) => p.parentId),
    teacherIds: groups.map((g) => g.teacherId).filter((x): x is string => !!x),
  };
}
