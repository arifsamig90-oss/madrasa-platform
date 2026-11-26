"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";

/** A form bound to a server action that returns { error } on failure. */
export function ActionForm({
  action,
  submit,
  children,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  submit: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-3">
      {children}
      {state?.error && <p className="text-[var(--bad)] text-sm" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Подождите…" : submit}</button>
    </form>
  );
}
