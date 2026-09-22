import { cookies } from "next/headers";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { authenticatedUser } from "@/lib/authentication";
import { runWithRuntimeState } from "@/db/runtime-store";
import { signInHref } from "@/lib/routes";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function requirePageUser(returnTo: string, ownerOnly = false) {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await runWithRuntimeState(false, async () => authenticatedUser(sessionToken));

  if (!user) redirect(signInHref(returnTo) as Route);
  if (ownerOnly && user.role !== "owner") notFound();

  return user;
}
