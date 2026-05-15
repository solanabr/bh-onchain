"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { upsertRating, deleteRating } from "@/app/(app)/admin/actions";

type Props = {
  submissionId: string;
  initialGrade: number | null;
  initialComment: string;
};

export function RatingForm({ submissionId, initialGrade, initialComment }: Props) {
  const [grade, setGrade] = useState<number | null>(initialGrade);
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const hasExistingRating = initialGrade !== null || initialComment.length > 0;
  const dirty =
    grade !== initialGrade || comment !== initialComment;

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await upsertRating({ submissionId, grade, comment });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(true);
    });
  }

  function handleClear() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await deleteRating({ submissionId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGrade(null);
      setComment("");
      setSuccess(true);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-bh-muted">Nota</span>
          <span className="font-heading text-xl font-bold text-bh-text">
            {grade ?? "—"}
            <span className="ml-1 text-xs font-normal text-bh-muted">/ 10</span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={grade ?? 0}
          onChange={(e) => setGrade(Number(e.target.value))}
          className="mt-2 w-full accent-bh-violet"
          aria-label="Nota"
        />
        <div className="mt-1 flex justify-between text-[10px] text-bh-muted">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      <div>
        <label
          htmlFor={`comment-${submissionId}`}
          className="mb-1.5 block text-xs uppercase tracking-wider text-bh-muted"
        >
          Comentário
        </label>
        <Textarea
          id={`comment-${submissionId}`}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="O que você achou deste projeto?"
          maxLength={2000}
        />
        <p className="mt-1 text-right text-[10px] text-bh-muted">
          {comment.length} / 2000
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      {success && !error && (
        <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Avaliação salva.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={pending || !dirty}
          className="px-5 py-2"
        >
          {pending ? "Salvando..." : hasExistingRating ? "Atualizar" : "Salvar"}
        </Button>
        {hasExistingRating && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={pending}
            className="px-4 py-2 text-xs text-bh-muted hover:text-red-300"
          >
            Remover minha avaliação
          </Button>
        )}
      </div>
    </div>
  );
}
