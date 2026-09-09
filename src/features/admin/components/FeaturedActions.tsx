"use client";

import { useState, useTransition } from "react";
import { updateFeatured, removeFeatured } from "@/features/admin/actions";

interface Props {
  id: string;
  active: boolean;
  position: number;
}

export default function FeaturedActions({ id, active, position }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const update = (patch: { active?: boolean; position?: number }) => {
    setError(null);
    startTransition(async () => {
      const result = await updateFeatured({ id, ...patch });
      if (!result.ok) setError(result.error);
    });
  };

  const remove = () => {
    if (!confirm("Remove this featured item?")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeFeatured(id);
      if (!result.ok) setError(result.error);
    });
  };

  const btn =
    "text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition disabled:opacity-50";

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex gap-1.5">
        <button
          disabled={pending}
          onClick={() => update({ position: Math.max(0, position - 1) })}
          className={btn}
          aria-label="Move up"
        >
          <span aria-hidden="true">↑</span>
        </button>
        <button
          disabled={pending}
          onClick={() => update({ position: position + 1 })}
          className={btn}
          aria-label="Move down"
        >
          <span aria-hidden="true">↓</span>
        </button>
        <button
          disabled={pending}
          onClick={() => update({ active: !active })}
          className={btn}
        >
          {active ? "Disable" : "Enable"}
        </button>
        <button
          disabled={pending}
          onClick={remove}
          className="text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      {error && (
        <span role="alert" className="text-xs text-red-300">
          {error}
        </span>
      )}
    </div>
  );
}
