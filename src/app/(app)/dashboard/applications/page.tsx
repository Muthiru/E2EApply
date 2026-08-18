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

export default async function ApplicationsPage() {
  const { userId } = await auth.protect();

  const [applications, prefill] = await Promise.all([
    prisma.application.findMany({
      where: { user: { clerkId: userId } },
      include: {
        job: true,
        statusEvents: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    getDiscoveryPrefill(),
  ]);

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
          <p className="mt-1 text-muted-foreground">
            Track every application from applied to offer — or rejection.
          </p>
        </div>
      </div>

      <JobPaste />

      <JobDiscovery prefillQuery={prefill.query} />

      {applications.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No applications tracked yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a job or discover one above to start.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Match</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last event</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr
                  key={application.id}
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-3 font-medium">
                    {application.job.company ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/applications/${application.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {application.job.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {application.job.matchScore !== null ? (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${matchBadgeClass(application.job.matchScore)}`}
                      >
                        {application.job.matchScore}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(application.status)}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusDotClass(application.status)}`}
                      />
                      {statusLabel(application.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {application.statusEvents[0]?.createdAt.toLocaleDateString() ??
                      "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
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
      )}
    </div>
  );
}