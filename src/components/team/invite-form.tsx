"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteForm({ teamId, teamName }: { teamId: string; teamName: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, email, teamName }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: body.error ?? "Não foi possível enviar o convite." });
      setLoading(false);
      return;
    }
    setMessage({ type: "success", text: `Convite enviado para ${email}.` });
    setEmail("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <Input
        type="email"
        required
        placeholder="email@dotime.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" variant="primary" disabled={loading || !email}>
        {loading ? "Enviando..." : "Enviar convite"}
      </Button>
      {message && (
        <p
          className={`mt-2 w-full text-sm sm:mt-0 ${
            message.type === "success" ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
