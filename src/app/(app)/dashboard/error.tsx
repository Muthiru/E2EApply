"use client";

import { useEffect } from "react";

export default function DashboardError({
    error,
    reset,
}: Readonly<{
    error: Error & { digest?: string };
    reset: () => void;
}>) {
    useEffect(() => {
        console.error("[dashboard] Unhandled error:", error);
    }, [error]);

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full border border-status-rejected/30 bg-status-rejected/5 p-4">
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="text-status-rejected"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
            </div>
            <div>
                <h2 className="text-lg font-semibold">Something went wrong</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {error.message || "An unexpected error occurred while loading this page."}
                </p>
            </div>
            <button
                type="button"
                onClick={reset}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            >
                Try again
            </button>
        </div>
    );
}
