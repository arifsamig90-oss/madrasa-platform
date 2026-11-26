import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUDIENCE_LABELS, canEditGroup, resultSummary } from "@/lib/rules";
import { fmtShortDate } from "@/lib/time";
import { createLesson } from "@/app/actions/journal";
import { createInvite } from "@/app/actions/admin";
import { InviteList } from "@/components/InviteList";

export default async function GroupJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const group = await db.group.findUnique({
    where: { id },
    include: {
      department: true,
      teacher: { select: { name: true } },
      members: { include: { student: true }, orderBy: { student: { name: "asc" } } },
      lessons: { orderBy: { startsAt: "asc" }, include: { records: true } },
    },
  });
  if (!group || !canEditGroup(user, group.teacherId)) notFound();

  const students = group.members.map((m) => m.student);
  const invites = await db.invite.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
      OR: [{ groupId: group.id }, { role: "PARENT", childId: { in: students.map((s) => s.id) } }],
    },
    orderBy: { createdAt: "desc" },
  });
  const nameById = new Map(students.map((s) => [s.id, s.name]));
  const rec = new Map(group.lessons.flatMap((l) => l.records.map((r) => [`${l.id}:${r.studentId}`, r] as const)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="!mb-1">{group.name}</h1>
        <p className="muted">{group.department.name} · {AUDIENCE_LABELS[group.audience]}{group.teacher && ` · ${group.teacher.name}`}</p>
      </div>

      <section className="card">
        <h2>Журнал</h2>
        {students.length === 0 ? (
          <p className="muted">В группе пока нет учеников. Создайте приглашение ниже.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th>Ученик</th>
                  {group.lessons.map((l) => (
                    <th key={l.id} className="whitespace-nowrap">
                      <Link href={`/lessons/${l.id}`} className="underline" title={l.topic}>{fmtShortDate(l.startsAt)}</Link>
                    </th>
                  ))}
                  <th>Сдано</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const marks = group.lessons.map((l) => rec.get(`${l.id}:${s.id}`));
                  const sum = resultSummary(marks.map((m) => m?.result));
                  return (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap"><Link href={`/students/${s.id}`} className="hover:underline">{s.name}</Link></td>
                      {marks.map((m, i) => (
                        <td key={group.lessons[i].id} className="text-center" title={m?.comment ?? undefined}>
                          {m?.attendance === "ABSENT" ? <span className="text-[var(--bad)]">н</span>
                            : m?.result === "PASSED" ? <span className="text-[var(--ok)] font-bold">✓</span>
                            : m?.result === "FAILED" ? <span className="text-[var(--bad)] font-bold">✗</span>
                            : m?.attendance ? "·" : ""}
                        </td>
                      ))}
                      <td className="whitespace-nowrap">{sum.passed}/{sum.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="muted text-xs mt-2">✓ сдал · ✗ не сдал · н не был · нажмите на дату, чтобы отметить урок</p>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Новый урок</h2>
        <form action={createLesson.bind(null, group.id)} className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="startsAt">Дата и время</label><input className="input" type="datetime-local" id="startsAt" name="startsAt" required /></div>
          <div><label className="label" htmlFor="durationMin">Длительность, мин</label><input className="input" type="number" id="durationMin" name="durationMin" defaultValue={60} min={10} max={600} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="topic">Тема</label><input className="input" id="topic" name="topic" required placeholder="Например: сура аль-Мульк, аяты 1–10" /></div>
          <div><label className="label" htmlFor="location">Место (если очно)</label><input className="input" id="location" name="location" placeholder="Аудитория 2" /></div>
          <div><label className="label" htmlFor="onlineUrl">Ссылка на онлайн-урок</label><input className="input" type="url" id="onlineUrl" name="onlineUrl" placeholder="https://telemost.yandex.ru/..." /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="homework">Домашнее задание</label><textarea className="input" id="homework" name="homework" rows={2} /></div>
          <div><button className="btn">Создать урок</button></div>
        </form>
      </section>

      <section className="card space-y-3">
        <h2>Приглашения</h2>
        <form action={createInvite} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="role" value="STUDENT" />
          <input type="hidden" name="groupId" value={group.id} />
          <button className="btn">Ссылка для ученика в эту группу</button>
        </form>
        {students.length > 0 && (
          <form action={createInvite} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="role" value="PARENT" />
            <div>
              <label className="label" htmlFor="childId">Ссылка для родителя ученика</label>
              <select className="input" id="childId" name="childId" required>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button className="btn btn-ghost">Создать</button>
          </form>
        )}
        <InviteList invites={invites.map((i) => ({ ...i, note: i.childId ? `родитель: ${nameById.get(i.childId)}` : undefined }))} />
      </section>
    </div>
  );
}
