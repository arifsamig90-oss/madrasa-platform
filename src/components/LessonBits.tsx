import { ATTENDANCE_LABELS } from "@/lib/rules";

export function ResultPill({ result }: { result: "PASSED" | "FAILED" | null | undefined }) {
  if (result === "PASSED") return <span className="pill pill-ok">Сдал</span>;
  if (result === "FAILED") return <span className="pill pill-bad">Не сдал</span>;
  return null;
}

export function AttendancePill({ value }: { value: keyof typeof ATTENDANCE_LABELS | null | undefined }) {
  if (!value || value === "PRESENT") return null; // only deviations are worth showing
  const cls = value === "ABSENT" ? "pill pill-bad" : "pill";
  return <span className={cls}>{ATTENDANCE_LABELS[value]}</span>;
}

export function JoinLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a className="btn !py-1" href={url} target="_blank" rel="noopener noreferrer">Войти на урок</a>
  );
}
