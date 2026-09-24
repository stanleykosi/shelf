import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "./concept-two.css";
import "./scan.css";
import "./research-workspace.css";
import "./platform-composition.css";
import "./discovery-studio.css";
import { AppShell } from "@/components/app-shell";
import { hasAuthenticatedSession } from "@/lib/authentication";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "Shelf", template: "%s · Shelf" },
  description: "Scan a product. Discover the company. Choose what to own.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const signedIn = hasAuthenticatedSession(sessionToken);

  return (
    <html lang="en">
      <body>
        <AppShell signedIn={signedIn} environment={env.APP_ENV}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
