"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addJobFromText } from "@/lib/actions/job";
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
        router.push(`/dashboard/applications/${result.applicationId}`);
      } else {
        setError(result.error);
        toast(result.error, "error");
      }
    });
  };

  return (
    <div className="panel p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Track a job</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a job description or URL to track and score it.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Paste the full job description here…"
            className="field-control min-h-40 resize-y pr-10"
            disabled={isPending}
          />
          {text && (
            <button
              type="button"
              onClick={() => setText("")}
              className="btn btn-quiet absolute right-2 top-2 h-8 min-h-0 w-8 p-0"
              disabled={isPending}
              aria-label="Clear job description"
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
            className="field-control pr-10"
            disabled={isPending}
          />
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="btn btn-quiet absolute right-2 top-1/2 h-8 min-h-0 w-8 -translate-y-1/2 p-0"
              disabled={isPending}
              aria-label="Clear posting URL"
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            className="btn btn-primary w-full sm:w-auto sm:min-w-37.5"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span>
                <span>Analyzing &amp; scoring…</span>
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
