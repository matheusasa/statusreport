"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { setActiveProjectAction } from "@/app/projects/actions";
import { UserMenu } from "./UserMenu";
import type { ProjectRecord } from "@/lib/projects";

interface SidebarUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const BASE_NAV_ITEMS = [
  { href: "/", label: "Visão Geral", icon: "dashboard" },
  { href: "/sprints", label: "Sprints", icon: "event_repeat" },
  { href: "/work-items", label: "Demandas", icon: "list_alt" },
  { href: "/agenda", label: "Agenda", icon: "calendar_month" },
];

function ProjectSwitcher({
  projects,
  activeProject,
}: {
  projects: ProjectRecord[];
  activeProject: ProjectRecord;
}) {
  return (
    <form action={setActiveProjectAction} className="px-3 pb-3">
      <label className="mb-1 block px-1 font-mono text-label-mono uppercase tracking-wider text-outline">
        Projeto ativo
      </label>
      <select
        name="projectId"
        defaultValue={activeProject.id}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </form>
  );
}

export function Sidebar({
  projects,
  activeProject,
  user,
}: {
  projects: ProjectRecord[];
  activeProject: ProjectRecord | null;
  user: SidebarUser;
}) {
  const pathname = usePathname();

  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(user.role === "ADMIN" || user.role === "MANAGER"
      ? [{ href: "/projects", label: "Projetos", icon: "folder_open" }]
      : []),
    ...(user.role === "ADMIN" ? [{ href: "/admin/users", label: "Usuários", icon: "group" }] : []),
  ];

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center gap-3 px-6 py-7">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary">
          <span className="material-symbols-outlined text-[20px]">insights</span>
        </div>
        <div>
          <h1 className="text-body-lg font-semibold leading-tight text-on-surface">Status Report</h1>
          <p className="truncate font-mono text-label-mono uppercase tracking-wider text-outline">
            {activeProject ? activeProject.name : "Nenhum projeto"}
          </p>
        </div>
      </div>

      {activeProject && projects.length > 0 ? (
        <ProjectSwitcher projects={projects} activeProject={activeProject} />
      ) : null}

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-md transition-colors ${
                active
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {activeProject ? (
        <div className="border-t border-outline-variant p-4">
          <p className="font-mono text-label-mono uppercase tracking-wider text-outline">Fonte de dados</p>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {activeProject.source === "PARQUET" ? "Exportações Azure DevOps (.parquet)" : "API do Azure DevOps (sincronizado)"}
          </p>
        </div>
      ) : null}

      <UserMenu name={user.name} email={user.email} role={user.role} />
    </aside>
  );
}
