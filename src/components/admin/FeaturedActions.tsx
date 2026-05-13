"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  active: boolean;
  position: number;
}

export default function FeaturedActions({ id, active, position }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const update = (data: Record<string, unknown>) => {
    startTransition(async () => {
      await fetch(`/api/admin/featured/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm("Remove this featured item?")) return;
    startTransition(async () => {
      await fetch(`/api/admin/featured/${id}`, { method: "DELETE" });
      router.refresh();
    });
  };

  const btn =
    "text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition disabled:opacity-50";

  return (
    <div className="inline-flex gap-1.5">
      <button
        disabled={pending}
        onClick={() => update({ position: Math.max(0, position - 1) })}
        className={btn}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        disabled={pending}
        onClick={() => update({ position: position + 1 })}
        className={btn}
        aria-label="Move down"
      >
        ↓
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
  );
}
