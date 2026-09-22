import { ScreenRouter } from "@/components/screen-router";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authenticatedUser } from "@/lib/authentication";
import { runWithRuntimeState } from "@/db/runtime-store";
import { pageAccess } from "@/lib/page-access";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { env } from "@/lib/env";

export default async function Page({ params, searchParams }: PageProps<"/[[...path]]">) {
  const [{ path = [] }, query] = await Promise.all([params, searchParams]);
  const pathname = `/${path.join("/")}`;
  const access = pageAccess(pathname);

  if (access !== "public") {
    const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    const user = await runWithRuntimeState(false, async () => authenticatedUser(sessionToken));

    if (!user) redirect(`/sign-in?returnTo=${encodeURIComponent(pathname)}`);
    if (access === "owner" && user.role !== "owner") notFound();
  }

  return <ScreenRouter segments={path} query={query} supportContact={env.SUPPORT_CONTACT} />;
}
