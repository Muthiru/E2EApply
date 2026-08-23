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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-2 text-base text-muted-foreground">
            {profile
              ? `${profile.fullName ?? "Welcome back"} — here's where your job search stands.`
              : "Welcome — build your master candidate profile to get started."}
          </p>
        </div>
        {profile ? (
          <Link
            href="/profile"
            className="shrink-0 inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-all hover:bg-[#f4f4f5] hover:border-foreground/20"
          >
            Edit profile
          </Link>
        ) : (
          <Link
            href="/profile"
            className="shrink-0 inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 shadow-md hover:shadow-lg"
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

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Where your applications stand right now.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {(["PENDING", "APPLIED", "ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED"] as const).map(
            (status) => (
              <div key={status} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/30 border border-border">
                <span className={`h-3 w-3 rounded-full ${statusDotClass(status)}`} />
                <span className="text-sm font-medium text-foreground">
                  {statusLabel(status)}
                </span>
                <span className="text-2xl font-bold text-foreground">
                  {pipelineCount[status] ?? 0}
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Next step</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {profile
            ? "Paste your first job posting — job analysis, match score, and tailored documents are on the way. Track everything manually in the meantime."
            : "Build your master candidate profile first — match scores, CVs, and cover letters are all generated from it."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/applications"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-all hover:bg-[#f4f4f5] hover:border-foreground/20"
          >
            View applications
          </Link>
          <Link
            href={profile ? "/dashboard/applications" : "/profile"}
            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 shadow-md hover:shadow-lg"
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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}