"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { initials } from "@/lib/format";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Gerente",
  CLIENT: "Cliente",
};

export function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 border-t border-outline-variant p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-bold text-on-primary-fixed">
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-semibold text-on-surface">{name}</p>
        <p className="truncate font-mono text-label-mono uppercase tracking-wider text-outline">
          {ROLE_LABEL[role] ?? role} · {email}
        </p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        title="Sair"
        className="shrink-0 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
      </button>
    </div>
  );
}
