import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canViewStudent, resultSummary } from "@/lib/rules";
import { studentAccessContext } from "@/lib/queries";
import { fmtDateTime } from "@/lib/time";
import { AttendancePill, ResultPill } from "@/components/LessonBits";

export default async function StudentResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireUser();
  const student = await db.user.findUnique({ where: { id } });
  if (!student || !canViewStudent(viewer, id, await studentAccessContext(id))) notFound();

  const groups = await db.group.findMany({
    where: { members: { some: { studentId: id } } },
    include: {
      department: true,
      teacher: { select: { name: true } },
      lessons: {
        where: { OR: [{ startsAt: { lte: new Date() } }, { records: { some: { studentId: id } } }] },
        orderBy: { startsAt: "desc" },
        include: { records: { where: { studentId: id } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <h1>Результаты: {student.name}</h1>
      {groups.length === 0 && <p className="muted">Ученик пока не состоит ни в одной группе.</p>}
      {groups.map((g) => {
        const s = resultSummary(g.lessons.map((l) => l.records[0]?.result));
        const absent = g.lessons.filter((l) => l.records[0]?.attendance === "ABSENT").length;
        return (
          <section key={g.id} className="card">
            <div className="flex flex-wrap items-baseline gap-3 mb-2">
              <h2 className="!mb-0">{g.name}</h2>
              <span className="muted">{g.department.name}{g.teacher && ` · ${g.teacher.name}`}</span>
              <span className="ml-auto">Сдано <b>{s.passed} из {s.total}</b> · пропусков: {absent}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th>Дата</th><th>Тема</th><th>Посещение</th><th>Зачёт</th><th>Комментарий</th></tr></thead>
                <tbody>
                  {g.lessons.map((l) => {
                    const rec = l.records[0];
                    return (
                      <tr key={l.id}>
                        <td className="whitespace-nowrap">{fmtDateTime(l.startsAt)}</td>
                        <td>{l.topic}</td>
                        <td><AttendancePill value={rec?.attendance} /></td>
                        <td><ResultPill result={rec?.result} />{rec?.score != null && <span className="muted"> {rec.score}</span>}</td>
                        <td className="muted">{rec?.comment}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
