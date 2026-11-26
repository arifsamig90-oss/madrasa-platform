"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEditGroup } from "@/lib/rules";
import { str } from "@/lib/forms";
import { parseLocal } from "@/lib/time";

const ATTENDANCE = ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;
const RESULTS = ["PASSED", "FAILED"] as const;

async function requireGroupEditor(groupId: string) {
  const user = await requireUser();
  const group = await db.group.findUniqueOrThrow({ where: { id: groupId } });
  if (!canEditGroup(user, group.teacherId)) throw new Error("Нет доступа к группе");
  return { user, group };
}

function safeUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function createLesson(groupId: string, fd: FormData) {
  await requireGroupEditor(groupId);
  const startsAt = parseLocal(str(fd, "startsAt"));
  const topic = str(fd, "topic");
  const duration = Number(str(fd, "durationMin") || 60);
  if (!startsAt || !topic) throw new Error("Укажите дату и тему");
  const lesson = await db.lesson.create({
    data: {
      groupId,
      startsAt,
      topic,
      durationMin: Number.isFinite(duration) && duration > 0 && duration <= 600 ? Math.round(duration) : 60,
      location: str(fd, "location") || null,
      onlineUrl: safeUrl(str(fd, "onlineUrl")),
      homework: str(fd, "homework") || null,
    },
  });
  redirect(`/lessons/${lesson.id}`);
}

export async function updateLesson(lessonId: string, fd: FormData) {
  const lesson = await db.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  await requireGroupEditor(lesson.groupId);
  const startsAt = parseLocal(str(fd, "startsAt"));
  await db.lesson.update({
    where: { id: lessonId },
    data: {
      topic: str(fd, "topic") || lesson.topic,
      startsAt: startsAt ?? lesson.startsAt,
      location: str(fd, "location") || null,
      onlineUrl: safeUrl(str(fd, "onlineUrl")),
      homework: str(fd, "homework") || null,
    },
  });
  revalidatePath(`/lessons/${lessonId}`);
}

export async function deleteLesson(lessonId: string) {
  const lesson = await db.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  await requireGroupEditor(lesson.groupId);
  await db.lesson.delete({ where: { id: lessonId } });
  redirect(`/groups/${lesson.groupId}`);
}

/** Saves attendance and pass/fail for every student in the lesson's group. */
export async function saveRecords(lessonId: string, fd: FormData) {
  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { group: { include: { members: true } } },
  });
  await requireGroupEditor(lesson.groupId);

  const ops = lesson.group.members.map(({ studentId }) => {
    const a = str(fd, `att_${studentId}`);
    const r = str(fd, `res_${studentId}`);
    const s = str(fd, `score_${studentId}`);
    const score = s === "" ? null : Number(s);
    const data = {
      attendance: (ATTENDANCE as readonly string[]).includes(a) ? (a as (typeof ATTENDANCE)[number]) : null,
      result: (RESULTS as readonly string[]).includes(r) ? (r as (typeof RESULTS)[number]) : null,
      score: score !== null && Number.isInteger(score) && score >= 0 && score <= 100 ? score : null,
      comment: str(fd, `comment_${studentId}`) || null,
    };
    return db.lessonRecord.upsert({
      where: { lessonId_studentId: { lessonId, studentId } },
      create: { lessonId, studentId, ...data },
      update: data,
    });
  });
  await db.$transaction(ops);
  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath(`/groups/${lesson.groupId}`);
}
