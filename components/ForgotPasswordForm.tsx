"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await requestPasswordReset({ email, redirectTo: "/reset-password" });
    setLoading(false);
    // Always show the same confirmation regardless of whether the email
    // exists, so this form can't be used to enumerate registered accounts.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success-container p-4">
          <span className="material-symbols-outlined mt-0.5 text-[18px] text-success">mark_email_read</span>
          <p className="text-body-md text-success">
            Se houver uma conta com o email <strong>{email}</strong>, enviamos um link para definir sua senha.
          </p>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-body-md font-semibold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block font-mono text-label-mono uppercase tracking-wider text-outline">Email</label>
        <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 transition-colors focus-within:border-primary">
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
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar link"}
      </button>
      <p className="text-center text-body-md text-on-surface-variant">
        <Link href="/login" className="text-primary hover:underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
