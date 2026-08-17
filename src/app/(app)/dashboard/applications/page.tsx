import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function ApplicationsPage() {
  const { userId } = await auth.protect();

  const applications = userId
    ? await prisma.application.findMany({
        where: { user: { clerkId: userId } },
        include: { job: true, statusEvents: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-muted-foreground">
          Manual tracker — status updates and history arrive with Phase 1.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No applications tracked yet. Paste your first job to start.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Last event</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{application.job.company ?? "—"}</td>
                  <td className="px-4 py-2">{application.job.title}</td>
                  <td className="px-4 py-2">{application.status}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {application.statusEvents[0]?.createdAt.toLocaleDateString() ??
                      "—"}
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