import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { statusLabel, statusDotClass } from "@/lib/status";

export default async function DashboardPage() {
  const { userId } = await auth.protect();

  const profile = await prisma.profile.findFirst({
    where: { user: { clerkId: userId } },
  });

  const [applicationCount, pipeline] = await Promise.all([
    prisma.application.count({ where: { user: { clerkId: userId } } }),
    prisma.application.groupBy({
      by: ["status"],
      where: { user: { clerkId: userId } },
      _count: true,
    }),
  ]);

  const pipelineCount = Object.fromEntries(
    pipeline.map((row) => [row.status, row._count]),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            {profile
              ? `${profile.fullName ?? "Welcome back"} — here's where your job search stands.`
              : "Welcome — build your master candidate profile to get started."}
          </p>
        </div>
        {profile ? (
          <Link
            href="/profile"
            className="shrink-0 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Edit profile
          </Link>
        ) : (
          <Link
            href="/profile"
            className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            Build profile
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Applications tracked" value={applicationCount} />
        <StatCard
          label="Profile"
          value={profile ? "Complete" : "Incomplete"}
          detail={profile ? "Set in Profile" : "Required for match scores"}
          href="/profile"
        />
        <StatCard
          label="Job analysis"
          value={profile ? "Ready" : "Needs profile"}
          detail={profile ? "Paste a job to analyze" : "Build profile first"}
        />
      </div>

      <section className="rounded-lg border p-6">
        <h2 className="text-base font-semibold">Pipeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Where your applications stand right now.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4">
          {(["PENDING", "APPLIED", "ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED"] as const).map(
            (status) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${statusDotClass(status)}`} />
                <span className="text-sm text-muted-foreground">
                  {statusLabel(status)}
                </span>
                <span className="text-sm font-semibold">
                  {pipelineCount[status] ?? 0}
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="text-base font-semibold">Next step</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {profile
            ? "Paste your first job posting — job analysis, match score, and tailored documents are on the way. Track everything manually in the meantime."
            : "Build your master candidate profile first — match scores, CVs, and cover letters are all generated from it."}
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/dashboard/applications"
            className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            View applications
          </Link>
          <Link
            href={profile ? "/dashboard/applications" : "/profile"}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            {profile ? "Track an application" : "Build profile"}
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string | number;
  detail?: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-lg border p-5 transition-colors hover:border-accent">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}