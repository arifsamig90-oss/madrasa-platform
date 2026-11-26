import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { readSessionUserId } from "./session";
import type { Role } from "./rules";

export const getCurrentUser = cache(async () => {
  const id = await readSessionUserId();
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, gender: true, roles: true },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.some((r) => user.roles.includes(r))) redirect("/");
  return user;
}
