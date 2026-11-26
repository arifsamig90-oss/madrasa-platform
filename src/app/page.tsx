import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dayBounds, fmtTime } from "@/lib/time";
import { StudentOverview } from "@/components/StudentOverview";
import { JoinLink } from "@/components/LessonBits";

export default async function TodayPage() {
  const user = await requireUser();
  const r = user.roles;
  const { start, end } = dayBounds(new Date());

  const teacherLessons = r.includes("TEACHER")
    ? await db.lesson.findMany({
        where: { group: { teacherId: user.id }, startsAt: { gte: start, lt: end } },
        include: { group: true },
        orderBy: { startsAt: "asc" },
      })
    : [];
  const children = r.includes("PARENT")
    ? await db.parentChild.findMany({ where: { parentId: user.id }, include: { child: true } })
    : [];

  return (
    <div className="space-y-6">
      <h1>Ассаляму алейкум, {user.name.split(" ")[0]}!</h1>

      {r.length === 0 && <p className="muted">У вас пока нет роли. Обратитесь к администратору.</p>}

      {r.includes("TEACHER") && (
        <section className="card">
          <h2>Мои уроки сегодня</h2>
          {teacherLessons.length === 0 && <p className="muted">Сегодня уроков нет. <Link className="underline" href="/groups">Мои группы</Link></p>}
          <ul className="space-y-2">
            {teacherLessons.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3">
                <b>{fmtTime(l.startsAt)}</b>
                <span className="flex-1">{l.topic} <span className="muted">· {l.group.name}</span></span>
                <JoinLink url={l.onlineUrl} />
                <Link className="btn btn-ghost !py-1" href={`/lessons/${l.id}`}>Журнал урока</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.includes("STUDENT") && <StudentOverview studentId={user.id} />}

      {r.includes("PARENT") && (
        <div className="space-y-6">
          {children.length === 0 && <p className="muted">К кабинету пока не привязан ни один ребёнок.</p>}
          {children.map((c) => (
            <StudentOverview key={c.childId} studentId={c.childId} name={c.child.name} />
          ))}
        </div>
      )}

      {r.includes("ADMIN") && (
        <section className="card">
          <h2>Администрирование</h2>
          <p><Link className="underline" href="/admin">Отделения и группы</Link> · <Link className="underline" href="/admin/people">Люди и приглашения</Link></p>
        </section>
      )}

      {r.includes("ACCOUNTANT") && (
        <section className="card">
          <h2>Оплаты</h2>
          <p className="muted">Раздел счетов и оплат появится на этапе 3.</p>
        </section>
      )}
    </div>
  );
}
