import { headers } from "next/headers";
import { revokeInvite } from "@/app/actions/admin";
import { ROLE_LABELS, type Role } from "@/lib/rules";
import { fmtShortDate } from "@/lib/time";

type InviteRow = { id: string; token: string; role: Role; expiresAt: Date; note?: string };

export async function InviteList({ invites }: { invites: InviteRow[] }) {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  if (invites.length === 0) return <p className="muted text-sm">Активных приглашений нет.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {invites.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center gap-2">
          <span className="pill">{ROLE_LABELS[i.role]}</span>
          {i.note && <span>{i.note}</span>}
          <input className="input !w-auto flex-1 min-w-60 font-mono text-xs" readOnly value={`${origin}/invite/${i.token}`} aria-label="Ссылка-приглашение" />
          <span className="muted">до {fmtShortDate(i.expiresAt)}</span>
          <form action={revokeInvite.bind(null, i.id)}><button className="text-[var(--bad)] underline">отменить</button></form>
        </li>
      ))}
    </ul>
  );
}
