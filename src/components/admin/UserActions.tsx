"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  role: "USER" | "ADMIN";
  banned: boolean;
}

export default function UserActions({ userId, role, banned }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const action = (op: "promote" | "demote" | "ban" | "unban" | "delete") => {
    if (op === "delete" && !confirm("Delete this user permanently?")) return;
    startTransition(async () => {
      await fetch(`/api/admin/users/${userId}`, {
        method: op === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: op === "delete" ? undefined : JSON.stringify({ op }),
      });
      router.refresh();
    });
  };

  const btn =
    "text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition disabled:opacity-50";

  return (
    <div className="inline-flex gap-1.5 flex-wrap justify-end">
      {role === "USER" ? (
        <button
          onClick={() => action("promote")}
          disabled={pending}
          className={btn}
        >
          Promote
        </button>
      ) : (
        <button
          onClick={() => action("demote")}
          disabled={pending}
          className={btn}
        >
          Demote
        </button>
      )}
      {banned ? (
        <button
          onClick={() => action("unban")}
          disabled={pending}
          className={btn}
        >
          Unban
        </button>
      ) : (
        <button
          onClick={() => action("ban")}
          disabled={pending}
          className={btn}
        >
          Ban
        </button>
      )}
      <button
        onClick={() => action("delete")}
        disabled={pending}
        className="text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
