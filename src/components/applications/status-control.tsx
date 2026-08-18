"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationStatus } from "@/lib/actions/job";
import { statusLabel } from "@/lib/status";
import { useToast } from "@/components/ui/toast";

const STATUSES = [
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "GHOSTED",
  "WITHDRAWN",
] as const;

export function StatusControl({
  applicationId,
  current,
}: {
  applicationId: string;
  current: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>(current);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleUpdate = () => {
    startTransition(async () => {
      const result = await updateApplicationStatus(
        applicationId,
        status,
        note.trim() || undefined,
      );
      if (result.ok) {
        setNote("");
        toast(`Status updated to ${statusLabel(status)}.`);
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {option.charAt(0) + option.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-64 rounded-md border px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleUpdate}
          disabled={isPending || status === current}
          className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        >
          {isPending ? "Updating…" : "Update status"}
        </button>
      </div>
    </div>
  );
}