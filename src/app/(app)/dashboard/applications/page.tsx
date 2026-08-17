import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { statusBadgeClass, statusLabel } from "@/lib/status";
import { isLikelyGhosted } from "@/lib/job/tracker";
import { JobPaste } from "@/components/applications/job-paste";
import { GhostedButton } from "@/components/applications/ghosted-button";

export default async function ApplicationsPage() {
  const { userId } = await auth.protect();

  const now = new Date();
  const applications = await prisma.application.findMany({
    where: { user: { clerkId: userId } },
    include: {
      job: true,
      statusEvents: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

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

      {applications.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No applications tracked yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a job above to start.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
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
                  className="border-b last:border-0 hover:bg-muted/50"
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
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          application.job.matchScore >= 70
                            ? "bg-status-offer/10 text-status-offer"
                            : application.job.matchScore >= 50
                              ? "bg-status-assessment/10 text-status-assessment"
                              : "bg-status-rejected/10 text-status-rejected"
                        }`}
                      >
                        {application.job.matchScore}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(application.status)}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusBadgeClass(application.status).split(" ")[1]}`}
                      />
                      {statusLabel(application.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {application.statusEvents[0]?.createdAt.toLocaleDateString() ??
                      "—"}
                  </td>
                  <td className="px-4 py-3">
                    {isLikelyGhosted(
                      application.status,
                      application.statusEvents[0]?.createdAt ?? null,
                      now,
                    ) && <GhostedButton applicationId={application.id} />}
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