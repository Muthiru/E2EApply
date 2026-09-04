"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMasterCv, generateExpertMasterCv } from "@/lib/actions/profile";
import { useToast } from "@/components/ui/toast";

type MasterCvBadgeInfo = {
    id: string;
    name: string;
    createdAt: Date;
};

export function MasterCvManager(props: Readonly<{ cvs: MasterCvBadgeInfo[] }>) {
    const { cvs } = props;
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [generating, setGenerating] = useState(false);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);

    const closeConfirm = () => setConfirmingId(null);

    useEffect(() => {
        if (!confirmingId) return;
        cancelRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeConfirm();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [confirmingId]);

    const handleDelete = (id: string) => {
        startTransition(async () => {
            const result = await deleteMasterCv(id);
            if (result.ok) {
                closeConfirm();
                toast("Master CV deleted.");
                router.refresh();
            } else {
                toast(result.error ?? "Failed to delete", "error");
            }
        });
    };

    return (
        <div className="panel mb-6 space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold">Your Master CVs</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Save versions tailored to different roles.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setGenerating(true);
                        startTransition(async () => {
                            const res = await generateExpertMasterCv();
                            setGenerating(false);
                            if (res.ok) {
                                toast("Expert Master CV generated successfully!");
                                router.refresh();
                            } else {
                                toast(res.error, "error");
                            }
                        });
                    }}
                    disabled={isPending || generating}
                    className="btn btn-primary"
                >
                    {generating ? "Generating..." : "Generate AI Master CV"}
                </button>
            </div>

            {cvs.length === 0 ? (
                <div className="panel-soft p-4 text-sm text-muted-foreground">
                    No Master CVs uploaded yet.
                </div>
            ) : (
                <ul className="space-y-2">
                    {cvs.map((cv) => (
                        <li key={cv.id} className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium" title={cv.name}>{cv.name}</p>
                                <p className="text-xs text-muted-foreground">Uploaded {new Date(cv.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <a
                                    href={`/api/profile/cv-master?id=${cv.id}`}
                                    className="btn btn-secondary min-h-8 px-3 py-1.5 text-xs"
                                >
                                    Download
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setConfirmingId(cv.id)}
                                    disabled={isPending}
                                    className="btn min-h-8 border border-status-rejected/20 bg-status-rejected/10 px-3 py-1.5 text-xs text-status-rejected hover:bg-status-rejected/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {confirmingId && (
                <dialog
                    open
                    className="fixed inset-0 z-50 m-0 flex h-screen w-screen max-h-none max-w-none items-center justify-center border-0 bg-black/40 p-4"
                    aria-labelledby="delete-confirm-title"
                    aria-describedby="delete-confirm-description"
                >
                    <div
                        className="dialog-enter max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-lg border bg-background p-6 shadow-xl"
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
                                <h2 id="delete-confirm-title" className="text-base font-semibold tracking-tight">
                                    Delete Master CV?
                                </h2>
                                <p id="delete-confirm-description" className="mt-1.5 text-sm text-muted-foreground">
                                    Are you sure you want to delete this Master CV? Applications using it will lose their context reference and fall back to Profile mode!
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                ref={cancelRef}
                                type="button"
                                onClick={closeConfirm}
                                disabled={isPending}
                                className="rounded-md border px-3 py-1.5 text-sm hover:border-foreground/50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(confirmingId)}
                                disabled={isPending}
                                className="btn min-h-9 bg-status-rejected px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {isPending ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    );
}
