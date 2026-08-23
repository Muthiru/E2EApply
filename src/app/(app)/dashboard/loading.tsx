export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <div className="h-8 w-48 rounded-md bg-muted" />
                    <div className="mt-2 h-4 w-72 rounded-md bg-muted" />
                </div>
                <div className="h-10 w-28 rounded-md bg-muted" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border p-5">
                        <div className="h-4 w-24 rounded bg-muted" />
                        <div className="mt-2 h-8 w-16 rounded bg-muted" />
                    </div>
                ))}
            </div>
            <div className="rounded-lg border p-6">
                <div className="h-5 w-20 rounded bg-muted" />
                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-4 w-20 rounded bg-muted" />
                    ))}
                </div>
            </div>
        </div>
    );
}
