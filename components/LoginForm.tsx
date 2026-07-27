"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";

function fieldClass() {
  return "flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 transition-colors focus-within:border-primary";
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn.email({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message ?? "Email ou senha inválidos.");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block font-mono text-label-mono uppercase tracking-wider text-outline">Email</label>
        <div className={fieldClass()}>
          <span className="material-symbols-outlined text-[18px] text-outline">mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
            placeholder="voce@empresa.com"
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="font-mono text-label-mono uppercase tracking-wider text-outline">Senha</label>
          <Link href="/forgot-password" className="font-mono text-label-mono text-primary hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <div className={fieldClass()}>
          <span className="material-symbols-outlined text-[18px] text-outline">lock</span>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="shrink-0 text-outline transition-colors hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      {error ? (
        <p className="flex items-center gap-1.5 text-body-md text-error">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
