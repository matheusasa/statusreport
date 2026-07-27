import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AuthSidePanel } from "@/components/AuthSidePanel";
import { listAccessibleProjects } from "@/lib/projects";
import { getActiveProject } from "@/lib/active-project";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Project Status Report",
  description: "Acompanhamento de status de projetos a partir dos dados do Azure DevOps.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Public routes (login, setup, forgot/reset password) render without the
  // authenticated shell — there's no project context and no user to show.
  if (!user) {
    return (
      <html lang="pt-BR" className="dark">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="flex min-h-screen bg-background text-on-background">
          <div className="flex min-h-screen w-full flex-1">
            <main className="flex flex-1 items-center justify-center p-6 md:p-10">
              <div className="w-full max-w-sm">{children}</div>
            </main>
            <AuthSidePanel />
          </div>
        </body>
      </html>
    );
  }

  const [projects, activeProject] = await Promise.all([listAccessibleProjects(user), getActiveProject(user)]);

  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen bg-background text-on-background">
        <Sidebar projects={projects} activeProject={activeProject} user={user} />
        <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
          <main className="mx-auto w-full max-w-page flex-1 space-y-6 p-6 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
