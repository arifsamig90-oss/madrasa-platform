import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { login } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <div className="mx-auto max-w-sm card mt-10">
      <h1>Вход</h1>
      <ActionForm action={login} submit="Войти">
        <div>
          <label className="label" htmlFor="login">E-mail или телефон</label>
          <input className="input" id="login" name="login" autoComplete="username" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Пароль</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
      </ActionForm>
      <p className="muted text-sm mt-4">Нет аккаунта? Попросите у устаза или администратора ссылку-приглашение.</p>
    </div>
  );
}
