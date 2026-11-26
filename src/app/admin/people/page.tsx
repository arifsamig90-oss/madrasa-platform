import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/rules";
import { createInvite } from "@/app/actions/admin";
import { InviteList } from "@/components/InviteList";

export default async function PeoplePage() {
  await requireRole("ADMIN");
  const [users, invites] = await Promise.all([
    db.user.findMany({ orderBy: { name: "asc" }, include: { children: { include: { child: true } } } }),
    db.invite.findMany({ where: { usedAt: null, expiresAt: { gt: new Date() } }, include: { group: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const names = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="space-y-6">
      <h1>Люди и приглашения</h1>

      <section className="card space-y-3">
        <h2>Пригласить сотрудника</h2>
        <form action={createInvite} className="flex flex-wrap gap-2">
          <select className="input !w-auto" name="role" aria-label="Роль">
            {(["TEACHER", "ACCOUNTANT", "ADMIN"] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <button className="btn">Создать ссылку</button>
        </form>
        <p className="muted text-sm">Учеников и родителей приглашают со страницы журнала группы. Ссылка одноразовая и действует 14 дней.</p>
        <InviteList
          invites={invites.map((i) => ({
            ...i,
            note: i.group ? `в группу «${i.group.name}»` : i.childId ? `родитель: ${names.get(i.childId) ?? ""}` : undefined,
          }))}
        />
      </section>

      <section className="card">
        <h2>Все пользователи ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>Имя</th><th>Роли</th><th>Контакт</th><th>Дети</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.roles.map((r) => ROLE_LABELS[r]).join(", ")}</td>
                  <td className="muted">{u.email ?? u.phone}</td>
                  <td className="muted">{u.children.map((c) => c.child.name).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
