import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { matchBadgeClass, statusBadgeClass, statusDotClass, statusLabel } from "@/lib/status";
import { isLikelyGhosted } from "@/lib/job/tracker";
import { JobPaste } from "@/components/applications/job-paste";
import { JobDiscovery } from "@/components/applications/job-discovery";
import { getDiscoveryPrefill } from "@/lib/actions/discover";

import { GhostedButton } from "@/components/applications/ghosted-button";
import { DeleteApplicationButton } from "@/components/applications/delete-application-button";

export default async function ApplicationsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ cursor?: string; direction?: string }>;
}>) {
  const { userId } = await auth.protect();
  const { cursor } = await searchParams;
  const PAGE_SIZE = 20;

  const whereClause = { user: { clerkId: userId } };

  const [applications, totalCount, prefill] = await Promise.all([
    prisma.application.findMany({
      where: whereClause,
      include: {
        job: true,
        statusEvents: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.application.count({ where: whereClause }),
    getDiscoveryPrefill(),
  ]);

  const hasMore = applications.length > PAGE_SIZE;
  const visibleApplications = hasMore ? applications.slice(0, PAGE_SIZE) : applications;
  const nextCursor = hasMore ? visibleApplications[visibleApplications.length - 1]?.id : null;
  const hasPrev = Boolean(cursor);

  const now = new Date();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Applications{totalCount > 0 && <span className="ml-2 text-xl font-normal text-muted-foreground">({totalCount})</span>}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Track every application from applied to offer — or rejection.
          </p>
        </div>
      </div>

      <JobPaste />

      <JobDiscovery
        prefillQuery={prefill.query}
        prefillLocation={prefill.location}
        prefillWorkModel={prefill.workModel}
      />

      {visibleApplications.length === 0 && !cursor ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center bg-muted/30">
          <p className="text-base font-medium text-foreground">No applications tracked yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste a job or discover one above to start.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Company</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Match</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Last event</th>
                  <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleApplications.map((application) => (
                  <tr
                    key={application.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">
                      {application.job.company ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/applications/${application.id}`}
                        className="font-medium text-primary hover:text-primary-hover underline-offset-2 hover:underline transition-colors"
                      >
                        {application.job.title}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      {application.job.matchScore === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${matchBadgeClass(application.job.matchScore)}`}
                        >
                          {application.job.matchScore}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(application.status)}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${statusDotClass(application.status)}`}
                        />
                        {statusLabel(application.status)}
                      </span>
                    </td>
                    <td className="hidden px-6 py-4 text-muted-foreground sm:table-cell">
                      {application.statusEvents[0]?.createdAt.toLocaleDateString() ??
                        "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {isLikelyGhosted(
                          application.status,
                          application.statusEvents[0]?.createdAt ?? null,
                          now,
                        ) && <GhostedButton applicationId={application.id} />}
                        <DeleteApplicationButton
                          applicationId={application.id}
                          label={`${application.job.company ?? application.job.title} — ${application.job.title}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(hasPrev || hasMore) && (
            <div className="mt-6 flex items-center justify-between">
              {hasPrev ? (
                <Link
                  href="/dashboard/applications"
                  className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all hover:bg-[#f4f4f5] hover:border-foreground/20"
                >
                  ← First page
                </Link>
              ) : <span />}
              {nextCursor ? (
                <Link
                  href={`/dashboard/applications?cursor=${nextCursor}`}
                  className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all hover:bg-[#f4f4f5] hover:border-foreground/20"
                >
                  Next page →
                </Link>
              ) : <span />}
            </div>
          )}
        </>
      )}
    </div>
  );
}