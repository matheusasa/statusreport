"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/auth-client";

function fieldClass() {
  return "flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 transition-colors focus-within:border-primary";
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Link inválido ou expirado. Solicite um novo em 'Esqueci minha senha'.");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await resetPassword({ newPassword: password, token });
    setLoading(false);

    if (resetError) {
      setError(resetError.message ?? "Não foi possível redefinir a senha. O link pode ter expirado.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success-container p-4">
        <span className="material-symbols-outlined mt-0.5 text-[18px] text-success">check_circle</span>
        <p className="text-body-md text-success">Senha definida! Redirecionando para o login...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block font-mono text-label-mono uppercase tracking-wider text-outline">
          Nova senha
        </label>
        <div className={fieldClass()}>
          <span className="material-symbols-outlined text-[18px] text-outline">lock</span>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
            placeholder="Mínimo 8 caracteres"
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
      <div>
        <label className="mb-1.5 block font-mono text-label-mono uppercase tracking-wider text-outline">
          Confirmar senha
        </label>
        <div className={fieldClass()}>
          <span className="material-symbols-outlined text-[18px] text-outline">lock</span>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
          />
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
        {loading ? "Salvando..." : "Definir senha"}
      </button>
      <p className="text-center text-body-md text-on-surface-variant">
        <Link href="/login" className="text-primary hover:underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
