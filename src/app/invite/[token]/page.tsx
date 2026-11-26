import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { acceptInvite } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { AUDIENCE_LABELS, ROLE_LABELS } from "@/lib/rules";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({
    where: { token },
    include: { group: { include: { department: true } } },
  });
  const child = invite?.childId ? await db.user.findUnique({ where: { id: invite.childId } }) : null;
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return <div className="card max-w-md mx-auto mt-10">Приглашение недействительно или устарело.</div>;
  }
  const user = await getCurrentUser();
  const action = acceptInvite.bind(null, token);

  return (
    <div className="mx-auto max-w-md card mt-10 space-y-3">
      <h1>Приглашение</h1>
      <p>
        Роль: <b>{ROLE_LABELS[invite.role]}</b>
        {invite.group && (
          <> · группа «{invite.group.name}» ({invite.group.department.name}, {AUDIENCE_LABELS[invite.group.audience].toLowerCase()})</>
        )}
        {child && <> · ребёнок: {child.name}</>}
      </p>
      {user ? (
        <ActionForm action={action} submit="Принять приглашение">
          <p className="muted text-sm">Вы вошли как {user.name}. Приглашение добавится в ваш кабинет.</p>
        </ActionForm>
      ) : (
        <ActionForm action={action} submit="Зарегистрироваться">
          <div>
            <label className="label" htmlFor="name">Имя и фамилия</label>
            <input className="input" id="name" name="name" required />
          </div>
          <fieldset>
            <legend className="label">Пол</legend>
            <label className="mr-4"><input type="radio" name="gender" value="MALE" required /> Мужской</label>
            <label><input type="radio" name="gender" value="FEMALE" /> Женский</label>
          </fieldset>
          <div>
            <label className="label" htmlFor="login">E-mail или телефон (для входа)</label>
            <input className="input" id="login" name="login" autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Пароль, не короче 8 символов</label>
            <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
          </div>
        </ActionForm>
      )}
    </div>
  );
}
