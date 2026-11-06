"use client";

import { useEffect, useId, useRef } from "react";

type DeleteConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  detail?: string;
  isPending: boolean;
  confirmLabel?: string;
  pendingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmationDialog({
  open,
  title,
  description,
  detail = "This can't be undone.",
  isPending,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isPendingRef = useRef(isPending);
  const dialogId = useId();

  useEffect(() => {
    isPendingRef.current = isPending;
  });

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPendingRef.current) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${dialogId}-title`}
      aria-describedby={`${dialogId}-description`}
      onClick={() => {
        if (!isPending) onCancel();
      }}
    >
      <div
        className="dialog-enter w-full max-w-sm rounded-lg border bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 id={`${dialogId}-title`} className="text-base font-semibold tracking-tight">
              {title}
            </h2>
            <p
              id={`${dialogId}-description`}
              className="mt-1.5 text-sm text-muted-foreground [overflow-wrap:anywhere]"
              title={description}
            >
              {description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border px-3 py-1.5 text-sm hover:border-foreground/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-status-rejected px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
