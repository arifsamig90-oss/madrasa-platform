import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export function Nav({ user }: { user: CurrentUser }) {
  const r = user.roles;
  const links: { href: string; label: string }[] = [{ href: "/", label: "Сегодня" }];
  if (r.includes("TEACHER") || r.includes("ADMIN")) links.push({ href: "/groups", label: "Мои группы" });
  if (r.includes("STUDENT")) links.push({ href: `/students/${user.id}`, label: "Мои результаты" });
  if (r.includes("PARENT")) links.push({ href: "/children", label: "Мои дети" });
  if (r.includes("ADMIN")) {
    links.push({ href: "/admin", label: "Группы и отделения" });
    links.push({ href: "/admin/people", label: "Люди и приглашения" });
  }
  return (
    <header className="border-b border-[var(--line)] bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/" className="font-bold text-[var(--brand)]">Медресе онлайн</Link>
        <nav className="flex flex-wrap gap-3 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">{l.label}</Link>
          ))}
        </nav>
        <form action={logout} className="ml-auto flex items-center gap-2 text-sm">
          <span className="muted">{user.name}</span>
          <button className="btn btn-ghost !py-1">Выйти</button>
        </form>
      </div>
    </header>
  );
}
