export default function ApplicationDetailLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="h-8 w-64 rounded-md bg-muted" />
                    <div className="mt-2 h-4 w-48 rounded-md bg-muted" />
                </div>
                <div className="h-10 w-10 rounded-md bg-muted" />
            </div>
            <div className="rounded-lg border p-5">
                <div className="h-5 w-28 rounded bg-muted" />
                <div className="mt-2 h-4 w-60 rounded bg-muted" />
                <div className="mt-4 h-10 w-20 rounded-full bg-muted" />
            </div>
            <div className="rounded-lg border p-5">
                <div className="h-5 w-40 rounded bg-muted" />
                <div className="mt-4 space-y-3">
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-5/6 rounded bg-muted" />
                </div>
            </div>
            <div className="rounded-lg border p-5">
                <div className="h-5 w-24 rounded bg-muted" />
                <div className="mt-4 space-y-2">
                    <div className="h-32 w-full rounded bg-muted" />
                </div>
            </div>
        </div>
    );
}
