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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Track a job</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste the job description or a posting URL — the role is extracted,
          scored against your profile, and ready for a tailored CV and cover
          letter.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Paste the full job description here…"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
            disabled={isPending}
          />
          {text && (
            <button
              type="button"
              onClick={() => setText("")}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
              disabled={isPending}
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="relative">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Posting URL (or paste the URL alone)"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
            disabled={isPending}
          />
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
              disabled={isPending}
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-3">
          {error && (
            <div className="flex-1 rounded-lg bg-error/10 border border-error/20 px-4 py-3">
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || (text.trim().length < 80 && url.trim().length === 0)}
            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-6 py-3 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] shadow-md hover:shadow-lg transition-all"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span>
                Analyzing & scoring…
              </span>
            ) : (
              "Add to tracker"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}