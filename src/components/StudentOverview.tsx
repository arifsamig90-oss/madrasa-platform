import Link from "next/link";
import { studentOverview } from "@/lib/queries";
import { fmtDateTime } from "@/lib/time";
import { AttendancePill, JoinLink, ResultPill } from "./LessonBits";

export async function StudentOverview({ studentId, name }: { studentId: string; name?: string }) {
  const { upcoming, recent } = await studentOverview(studentId);
  return (
    <section className="space-y-4">
      {name && <h2>{name}</h2>}
      <div className="card">
        <h2>Ближайшие уроки</h2>
        {upcoming.length === 0 && <p className="muted">На этой неделе уроков нет.</p>}
        <ul className="space-y-3">
          {upcoming.map((l) => (
            <li key={l.id} className="flex flex-wrap items-start gap-3">
              <div className="min-w-40 font-medium">{fmtDateTime(l.startsAt)}</div>
              <div className="flex-1">
                <div>{l.topic} <span className="muted">· {l.group.name}{l.group.teacher && `, ${l.group.teacher.name}`}</span></div>
                {l.location && <div className="muted text-sm">{l.location}</div>}
                {l.homework && <div className="text-sm mt-1"><b>Задание:</b> {l.homework}</div>}
              </div>
              <JoinLink url={l.onlineUrl} />
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <div className="flex items-baseline justify-between">
          <h2>Последние отметки</h2>
          <Link href={`/students/${studentId}`} className="text-sm underline">Все результаты</Link>
        </div>
        {recent.length === 0 && <p className="muted">Отметок пока нет.</p>}
        <ul className="space-y-2">
          {recent.map((r) => (
            <li key={r.lessonId} className="flex flex-wrap items-center gap-2">
              <span className="min-w-40">{fmtDateTime(r.lesson.startsAt)}</span>
              <span className="flex-1">{r.lesson.topic} <span className="muted">· {r.lesson.group.name}</span></span>
              <AttendancePill value={r.attendance} />
              <ResultPill result={r.result} />
              {r.comment && <span className="muted text-sm w-full">«{r.comment}»</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
