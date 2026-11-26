import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUDIENCE_LABELS } from "@/lib/rules";
import { addStudentToGroup, removeStudentFromGroup, setGroupTeacher } from "@/app/actions/admin";

export default async function AdminGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("ADMIN");
  const group = await db.group.findUnique({
    where: { id },
    include: { department: true, members: { include: { student: true }, orderBy: { student: { name: "asc" } } } },
  });
  if (!group) notFound();
  const memberIds = group.members.map((m) => m.studentId);
  const [teachers, candidates] = await Promise.all([
    db.user.findMany({ where: { roles: { has: "TEACHER" } }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: {
        roles: { has: "STUDENT" },
        id: { notIn: memberIds },
        ...(group.audience === "MIXED" ? {} : { gender: group.audience }),
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm underline" href="/admin">← Отделения и группы</Link>
        <h1 className="!mb-1 mt-2">{group.name}</h1>
        <p className="muted">{group.department.name} · {AUDIENCE_LABELS[group.audience]} · <Link className="underline" href={`/groups/${group.id}`}>журнал</Link></p>
      </div>

      <section className="card">
        <h2>Устаз</h2>
        <form action={setGroupTeacher.bind(null, group.id)} className="flex flex-wrap gap-2">
          <select className="input !w-auto" name="teacherId" defaultValue={group.teacherId ?? ""} aria-label="Устаз">
            <option value="">— не назначен —</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn">Сохранить</button>
        </form>
      </section>

      <section className="card space-y-3">
        <h2>Ученики ({group.members.length})</h2>
        <ul className="space-y-1">
          {group.members.map(({ student }) => (
            <li key={student.id} className="flex gap-3">
              <span className="flex-1">{student.name}</span>
              <form action={removeStudentFromGroup.bind(null, group.id, student.id)}>
                <button className="text-[var(--bad)] underline text-sm">убрать</button>
              </form>
            </li>
          ))}
        </ul>
        {candidates.length > 0 ? (
          <form action={addStudentToGroup.bind(null, group.id)} className="flex flex-wrap gap-2">
            <select className="input !w-auto" name="studentId" aria-label="Ученик">
              {candidates.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn">Добавить</button>
          </form>
        ) : (
          <p className="muted text-sm">Нет зарегистрированных учеников, подходящих для этой группы. Пригласите их по ссылке со страницы журнала.</p>
        )}
      </section>
    </div>
  );
}
