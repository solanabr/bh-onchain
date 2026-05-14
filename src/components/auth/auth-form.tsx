"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const inviteRedirect = searchParams.get("redirect");

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback${
      inviteRedirect ? `?redirect=${encodeURIComponent(inviteRedirect)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setError("Não foi possível conectar com Google. Tente novamente.");
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const emailRedirectTo = `${window.location.origin}/auth/callback${
      inviteRedirect ? `?redirect=${encodeURIComponent(inviteRedirect)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });
    if (error) {
      setError("Não foi possível enviar o link. Verifique o e-mail e tente de novo.");
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-md p-8 sm:p-10">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/bh/symbol.png"
          alt="BH Onchain"
          className="mx-auto h-16 w-16 object-contain"
        />
        <h1 className="mt-5 font-heading text-2xl font-bold">Acessar a plataforma</h1>
        <p className="mt-2 text-sm text-bh-muted">
          Entre para submeter seu projeto no Hackathon BH Onchain.
        </p>
      </div>

      {error && (
        <p className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="mt-7 space-y-5">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="gap-3 py-4"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Entrar com Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-bh-border" />
          <span className="text-xs uppercase tracking-wider text-bh-muted">ou</span>
          <div className="h-px flex-1 bg-bh-border" />
        </div>

        {!magicLinkSent ? (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" fullWidth disabled={loading || !email} className="py-4">
              {loading ? "Enviando..." : "Receber link por e-mail"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3 rounded-xl bg-bh-surface-2/60 p-5 text-center">
            <p className="text-sm">
              Link enviado para <strong className="text-bh-text">{email}</strong>
            </p>
            <p className="text-xs text-bh-muted">
              Confira sua caixa de entrada e clique no link para entrar.
            </p>
            <button
              type="button"
              onClick={() => {
                setMagicLinkSent(false);
                setEmail("");
              }}
              className="text-xs text-bh-violet underline-offset-2 hover:underline"
            >
              Usar outro e-mail
            </button>
          </div>
        )}
      </div>

      <p className="mt-7 text-center text-xs text-bh-muted">
        Ao entrar você concorda com o regulamento do Hackathon BH Onchain.
      </p>
    </Card>
  );
}
