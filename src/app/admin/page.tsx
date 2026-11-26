import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUDIENCE_LABELS } from "@/lib/rules";
import { createDepartment, createGroup } from "@/app/actions/admin";

export default async function AdminPage() {
  await requireRole("ADMIN");
  const [departments, teachers] = await Promise.all([
    db.department.findMany({
      orderBy: { name: "asc" },
      include: { groups: { orderBy: { name: "asc" }, include: { teacher: { select: { name: true } }, _count: { select: { members: true } } } } },
    }),
    db.user.findMany({ where: { roles: { has: "TEACHER" } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1>Отделения и группы</h1>

      {departments.map((d) => (
        <section key={d.id} className="card">
          <h2>{d.name}</h2>
          {d.groups.length === 0 && <p className="muted">Групп пока нет.</p>}
          <ul className="space-y-1">
            {d.groups.map((g) => (
              <li key={g.id} className="flex flex-wrap gap-2">
                <Link className="underline" href={`/admin/groups/${g.id}`}>{g.name}</Link>
                <span className="muted">{AUDIENCE_LABELS[g.audience]} · учеников: {g._count.members} · {g.teacher?.name ?? "без устаза"}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="card">
        <h2>Новая группа</h2>
        {departments.length === 0 ? <p className="muted">Сначала создайте отделение.</p> : (
          <form action={createGroup} className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="g-name">Название</label><input className="input" id="g-name" name="name" required placeholder="Хифз, младшая группа" /></div>
            <div>
              <label className="label" htmlFor="g-dep">Отделение</label>
              <select className="input" id="g-dep" name="departmentId">{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            </div>
            <div>
              <label className="label" htmlFor="g-aud">Для кого</label>
              <select className="input" id="g-aud" name="audience">
                {Object.entries(AUDIENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="g-t">Устаз</label>
              <select className="input" id="g-t" name="teacherId">
                <option value="">— позже —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div><button className="btn">Создать группу</button></div>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Новое отделение</h2>
        <form action={createDepartment} className="flex flex-wrap gap-2">
          <input className="input !w-auto flex-1" name="name" required placeholder="Воскресная школа" aria-label="Название отделения" />
          <button className="btn">Создать</button>
        </form>
      </section>
    </div>
  );
}
