"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMasterCv, generateExpertMasterCv } from "@/lib/actions/profile";
import { useToast } from "@/components/ui/toast";
import { useState } from "react";

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

    const handleDelete = (id: string) => {
        if (!confirm("Are you sure you want to delete this Master CV? Applications using it will lose their context reference and fall back to Profile mode!")) return;
        startTransition(async () => {
            const result = await deleteMasterCv(id);
            if (result.ok) {
                toast("Master CV deleted.");
                router.refresh();
            } else {
                toast(result.error ?? "Failed to delete", "error");
            }
        });
    };

    return (
        <div className="mb-6 rounded-lg border p-4 space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-base font-semibold">Your Master CVs</h2>
                    <p className="mt-1 text-sm text-muted-foreground max-w-[450px]">
                        You can keep up to 3 Master CVs (e.g. Frontend, Backend, Management). Upload a new one via the &quot;Import from your CV&quot; below, or let the AI write an expert one for you.
                    </p>
                </div>
                <button
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
                    className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:bg-foreground/90 disabled:opacity-50"
                >
                    {generating ? "Generating..." : "Generate AI Master CV"}
                </button>
            </div>

            {cvs.length === 0 ? (
                <div className="flex items-center gap-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No Master CVs uploaded yet.
                </div>
            ) : (
                <ul className="space-y-2">
                    {cvs.map((cv) => (
                        <li key={cv.id} className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-4 py-3">
                            <div>
                                <p className="text-sm font-medium">{cv.name}</p>
                                <p className="text-xs text-muted-foreground">Uploaded {new Date(cv.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={`/api/profile/cv-master?id=${cv.id}`}
                                    className="rounded-md border px-3 py-1.5 text-xs hover:border-foreground/50 hover:text-foreground"
                                >
                                    Download
                                </a>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(cv.id)}
                                    disabled={isPending}
                                    className="rounded-md bg-status-rejected/10 px-3 py-1.5 text-xs text-status-rejected hover:bg-status-rejected/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
