import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ChildrenPage() {
  const user = await requireRole("PARENT");
  const links = await db.parentChild.findMany({
    where: { parentId: user.id },
    include: { child: { include: { memberships: { include: { group: { include: { department: true } } } } } } },
  });
  return (
    <div>
      <h1>Мои дети</h1>
      {links.length === 0 && <p className="muted">Попросите у устаза ссылку-приглашение для родителя, чтобы привязать ребёнка.</p>}
      <ul className="space-y-3">
        {links.map(({ child }) => (
          <li key={child.id} className="card flex flex-wrap items-center gap-3">
            <b className="flex-1">{child.name}</b>
            <span className="muted text-sm">{child.memberships.map((m) => `${m.group.department.name}: ${m.group.name}`).join(", ") || "без группы"}</span>
            <Link className="btn !py-1" href={`/students/${child.id}`}>Результаты</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
