import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "./concept-two.css";
import "./scan.css";
import "./research-workspace.css";
import "./platform-composition.css";
import "./discovery-studio.css";
import "./research-journey.css";
import "./feedback.css";
import "./workspace-studio.css";
import "./account-studio.css";
import "./collection-studio.css";
import "./portfolio-studio.css";
import "./task-dialog.css";
import { Notifications } from "@/components/notifications";
import { AppShell } from "@/components/app-shell";
import { hasAuthenticatedSession } from "@/lib/authentication";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { raleway } from "./fonts";

export const metadata: Metadata = {
  title: { default: "Shelf", template: "%s · Shelf" },
  description: "Explore current token listings, check issuer details, and choose what comes next.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children, modal }: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const signedIn = hasAuthenticatedSession(sessionToken);

  return (
    <html lang="en">
      <body className={raleway.variable}>
        <AppShell signedIn={signedIn}>
          {children}
        </AppShell>
        {modal}
        <Notifications />
      </body>
    </html>
  );
}
