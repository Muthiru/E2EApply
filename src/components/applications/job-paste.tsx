"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addJobFromText, scoreApplication } from "@/lib/actions/job";
import { useToast } from "@/components/ui/toast";

export function JobPaste() {
  const router = useRouter();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addJobFromText(text, url.trim() || undefined);
      if (result.ok) {
        setText("");
        setUrl("");
        toast("Job added to your tracker.");
        try {
          await scoreApplication(result.applicationId);
        } catch {
          // Job saved; scoring is retryable from the detail page.
        }
        router.push(`/dashboard/applications/${result.applicationId}`);
      } else {
        setError(result.error);
        toast(result.error, "error");
      }
    });
  };

  return (
    <div className="rounded-lg border p-5">
      <p className="text-sm font-medium">Track a job</p>
<p className="mt-1 text-xs text-muted-foreground">
          Paste the job description or a posting URL — the role is extracted,
          scored against your profile, and ready for a tailored CV and cover
          letter.
        </p>
      <div className="mt-3 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste the full job description here…"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Posting URL (or paste the URL alone)"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between gap-3">
          {error && (
            <p role="alert" className="text-sm text-status-rejected">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || (text.trim().length < 80 && url.trim().length === 0)}
            className="ml-auto rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {isPending ? "Analyzing & scoring…" : "Add to tracker"}
          </button>
        </div>
      </div>
    </div>
  );
}