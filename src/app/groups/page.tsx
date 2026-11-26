import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUDIENCE_LABELS } from "@/lib/rules";

export default async function GroupsPage() {
  const user = await requireRole("TEACHER", "ADMIN");
  const groups = await db.group.findMany({
    where: user.roles.includes("ADMIN") ? {} : { teacherId: user.id },
    include: { department: true, teacher: { select: { name: true } }, _count: { select: { members: true } } },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });
  return (
    <div>
      <h1>{user.roles.includes("ADMIN") ? "Все группы" : "Мои группы"}</h1>
      {groups.length === 0 && <p className="muted">Групп пока нет.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <li key={g.id}>
            <Link href={`/groups/${g.id}`} className="card block hover:border-[var(--brand)]">
              <b>{g.name}</b>
              <div className="muted text-sm">
                {g.department.name} · {AUDIENCE_LABELS[g.audience]} · учеников: {g._count.members}
                {g.teacher && ` · ${g.teacher.name}`}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
