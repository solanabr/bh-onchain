"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { sanitizeUrl } from "@/lib/security";
import type { User } from "@/types/db";

type Props = {
  email: string;
  initial: User | null;
};

export function OnboardingForm({ email, initial }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [github, setGithub] = useState(initial?.github_url ?? "");
  const [twitter, setTwitter] = useState(initial?.twitter_url ?? "");
  const [linkedin, setLinkedin] = useState(initial?.linkedin_url ?? "");
  const [telegram, setTelegram] = useState(initial?.telegram_handle ?? "");
  const [lumaConfirmed, setLumaConfirmed] = useState(!!initial?.luma_registered_at);
  const [ageConfirmed, setAgeConfirmed] = useState(!!initial?.age_attestation_at);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!fullName.trim()) {
      setError("Nome é obrigatório.");
      setLoading(false);
      return;
    }
    if (!lumaConfirmed) {
      setError("Você precisa confirmar a inscrição no Luma do evento.");
      setLoading(false);
      return;
    }
    if (!ageConfirmed) {
      setError("Você precisa confirmar que tem 18 anos ou mais.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada. Faça login novamente.");
      setLoading(false);
      return;
    }

    // Upsert (not just update) so the row gets created if the trigger missed
    // it — e.g. for users that existed in auth.users before the trigger.
    const now = new Date().toISOString();
    const row = {
      id: user.id,
      email: user.email!,
      full_name: fullName.trim(),
      github_url: sanitizeUrl(github),
      twitter_url: sanitizeUrl(twitter),
      linkedin_url: sanitizeUrl(linkedin),
      telegram_handle: telegram.trim() || null,
      luma_registered_at: initial?.luma_registered_at ?? now,
      age_attestation_at: initial?.age_attestation_at ?? now,
    };

    const { error: upsertError } = await supabase
      .from("users")
      .upsert(row, { onConflict: "id" });
    if (upsertError) {
      setError("Não foi possível salvar. Tente novamente.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" value={email} disabled />
      </div>

      <div>
        <Label htmlFor="full_name">Nome completo</Label>
        <Input
          id="full_name"
          required
          placeholder="Como você quer ser chamado"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="github" hint="opcional">GitHub</Label>
          <Input
            id="github"
            placeholder="github.com/seu-usuario"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="twitter" hint="opcional">X / Twitter</Label>
          <Input
            id="twitter"
            placeholder="x.com/seu-usuario"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="linkedin" hint="opcional">LinkedIn</Label>
          <Input
            id="linkedin"
            placeholder="linkedin.com/in/seu-usuario"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="telegram" hint="opcional">Telegram</Label>
          <Input
            id="telegram"
            placeholder="@seu-usuario"
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-stbr-yellow/40 bg-stbr-yellow/5 p-5">
        <p className="font-heading text-sm font-semibold text-stbr-yellow">
          Confirmações obrigatórias
        </p>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-bh-text">
            <input
              type="checkbox"
              checked={lumaConfirmed}
              onChange={(e) => setLumaConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-bh-border bg-bh-surface accent-bh-violet"
            />
            <span>
              Confirmo que me inscrevi no Luma do Hackathon BH Onchain com este e-mail (
              <strong className="text-bh-text">{email}</strong>).
            </span>
          </label>
        </div>

        <div className="border-t border-stbr-yellow/20 pt-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-bh-text">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-bh-border bg-bh-surface accent-bh-violet"
            />
            <span>
              Confirmo que tenho <strong className="text-bh-text">18 anos ou mais</strong>{" "}
              (requisito do regulamento).
            </span>
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={loading || !lumaConfirmed || !ageConfirmed || !fullName.trim()}
        className="py-4"
      >
        {loading ? "Salvando..." : "Salvar e continuar"}
      </Button>
    </form>
  );
}
