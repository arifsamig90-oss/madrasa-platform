import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ATTENDANCE_LABELS, canEditGroup } from "@/lib/rules";
import { fmtDateTime, TIME_ZONE } from "@/lib/time";
import { deleteLesson, saveRecords, updateLesson } from "@/app/actions/journal";
import { JoinLink } from "@/components/LessonBits";

function toLocalInput(d: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(d);
  return parts.replace(" ", "T");
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lesson = await db.lesson.findUnique({
    where: { id },
    include: {
      group: { include: { members: { include: { student: true }, orderBy: { student: { name: "asc" } } } } },
      records: true,
    },
  });
  if (!lesson || !canEditGroup(user, lesson.group.teacherId)) notFound();
  const byStudent = new Map(lesson.records.map((r) => [r.studentId, r]));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/groups/${lesson.groupId}`} className="text-sm underline">← {lesson.group.name}</Link>
        <h1 className="!mb-1 mt-2">{lesson.topic}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="muted">{fmtDateTime(lesson.startsAt)} · {lesson.durationMin} мин{lesson.location && ` · ${lesson.location}`}</span>
          <JoinLink url={lesson.onlineUrl} />
        </div>
      </div>

      <section className="card">
        <h2>Посещаемость и зачёт</h2>
        {lesson.group.members.length === 0 ? <p className="muted">В группе нет учеников.</p> : (
          <form action={saveRecords.bind(null, lesson.id)} className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th>Ученик</th><th>Посещение</th><th>Зачёт</th><th>Балл</th><th>Комментарий</th></tr></thead>
                <tbody>
                  {lesson.group.members.map(({ student: s }) => {
                    const r = byStudent.get(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap">{s.name}</td>
                        <td>
                          <select className="input !py-1" name={`att_${s.id}`} defaultValue={r?.attendance ?? ""} aria-label={`Посещение: ${s.name}`}>
                            <option value="">—</option>
                            {Object.entries(ATTENDANCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </td>
                        <td className="whitespace-nowrap">
                          <label className="mr-2"><input type="radio" name={`res_${s.id}`} value="PASSED" defaultChecked={r?.result === "PASSED"} /> сдал</label>
                          <label className="mr-2"><input type="radio" name={`res_${s.id}`} value="FAILED" defaultChecked={r?.result === "FAILED"} /> не сдал</label>
                          <label><input type="radio" name={`res_${s.id}`} value="" defaultChecked={!r?.result} /> —</label>
                        </td>
                        <td><input className="input !py-1 !w-20" type="number" min={0} max={100} name={`score_${s.id}`} defaultValue={r?.score ?? ""} aria-label={`Балл: ${s.name}`} /></td>
                        <td><input className="input !py-1" name={`comment_${s.id}`} defaultValue={r?.comment ?? ""} placeholder="Например: ошибки в мадда" aria-label={`Комментарий: ${s.name}`} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button className="btn">Сохранить</button>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Урок</h2>
        <form action={updateLesson.bind(null, lesson.id)} className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="topic">Тема</label><input className="input" id="topic" name="topic" defaultValue={lesson.topic} required /></div>
          <div><label className="label" htmlFor="startsAt">Дата и время</label><input className="input" type="datetime-local" id="startsAt" name="startsAt" defaultValue={toLocalInput(lesson.startsAt)} /></div>
          <div><label className="label" htmlFor="location">Место</label><input className="input" id="location" name="location" defaultValue={lesson.location ?? ""} /></div>
          <div><label className="label" htmlFor="onlineUrl">Ссылка на онлайн-урок</label><input className="input" type="url" id="onlineUrl" name="onlineUrl" defaultValue={lesson.onlineUrl ?? ""} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="homework">Домашнее задание</label><textarea className="input" id="homework" name="homework" rows={2} defaultValue={lesson.homework ?? ""} /></div>
          <div><button className="btn">Сохранить урок</button></div>
        </form>
        <form action={deleteLesson.bind(null, lesson.id)} className="mt-4">
          <button className="text-[var(--bad)] underline text-sm">Удалить урок</button>
        </form>
      </section>
    </div>
  );
}
