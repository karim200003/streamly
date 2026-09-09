"use client";

import { useState, useTransition } from "react";
import { updateUser } from "@/features/admin/actions";

type Op = "promote" | "demote" | "ban" | "unban" | "delete";

interface Props {
  userId: string;
  role: "USER" | "ADMIN";
  banned: boolean;
}

export default function UserActions({ userId, role, banned }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (op: Op) => {
    if (op === "delete" && !confirm("Delete this user permanently?")) return;
    setError(null);
    startTransition(async () => {
      // The action revalidates the admin pages itself, so no
      // router.refresh() here. Result is checked: the old version ignored
      // it, so a 403 or a last-admin refusal looked like success.
      const result = await updateUser({ userId, op });
      if (!result.ok) setError(result.error);
    });
  };

  const btn =
    "text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition disabled:opacity-50";

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex gap-1.5 flex-wrap justify-end">
        <button
          onClick={() => run(role === "USER" ? "promote" : "demote")}
          disabled={pending}
          className={btn}
        >
          {role === "USER" ? "Promote" : "Demote"}
        </button>
        <button
          onClick={() => run(banned ? "unban" : "ban")}
          disabled={pending}
          className={btn}
        >
          {banned ? "Unban" : "Ban"}
        </button>
        <button
          onClick={() => run("delete")}
          disabled={pending}
          className="text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {error && (
        <span role="alert" className="text-xs text-red-300 max-w-[240px] text-right">
          {error}
        </span>
      )}
    </div>
  );
}
