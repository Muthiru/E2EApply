export default function ApplicationsLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <div className="h-8 w-48 rounded-md bg-muted" />
                    <div className="mt-2 h-4 w-80 rounded-md bg-muted" />
                </div>
            </div>
            <div className="rounded-lg border p-5">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="mt-3 h-10 w-full rounded-md bg-muted" />
            </div>
            <div className="overflow-x-auto rounded-lg border">
                <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="h-4 w-28 rounded bg-muted" />
                            <div className="h-4 w-40 rounded bg-muted" />
                            <div className="h-6 w-14 rounded-full bg-muted" />
                            <div className="h-6 w-20 rounded-full bg-muted" />
                            <div className="h-4 w-24 rounded bg-muted" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
