"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const ERRORS: Record<string, string> = {
  invite_not_found: "Convite não encontrado ou já consumido.",
  already_on_team: "Você já está em um time neste hackathon.",
  not_authenticated: "Faça login para aceitar o convite.",
  invite_email_mismatch:
    "Este convite é para outro e-mail. Saia e entre com o e-mail correto.",
  team_full: "O time já atingiu o limite de 4 integrantes.",
  team_locked: "Este time já foi submetido e não aceita novos integrantes.",
};

export function AcceptInviteButton({ token, disabled }: { token: string; disabled?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("accept_team_invite", {
      p_invite_token: token,
    });

    if (rpcError) {
      setError(ERRORS[rpcError.message] ?? "Não foi possível aceitar o convite.");
      setLoading(false);
      return;
    }
    router.push("/team");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button
        variant="primary"
        fullWidth
        onClick={handleAccept}
        disabled={loading || !!disabled}
        className="py-4"
      >
        {loading ? "Aceitando..." : "Aceitar convite"}
      </Button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
