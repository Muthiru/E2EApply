import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { userId } = await auth.protect();

  const profile = userId
    ? await prisma.profile.findFirst({ where: { user: { clerkId: userId } } })
    : null;

  const applicationCount = userId
    ? await prisma.application.count({
        where: { user: { clerkId: userId } },
      })
    : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {profile
            ? `Profile complete: ${profile.fullName ?? "set your name in Profile"}`
            : "No profile yet — build your master candidate profile to get started."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Applications tracked" value={applicationCount} />
        <StatCard
          label="Profile"
          value={profile ? "Complete" : "Incomplete"}
          href="/profile"
        />
        <StatCard
          label="First job analysis"
          value={profile ? "Ready" : "Needs profile"}
        />
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Next step</h2>
        {profile ? (
          <p className="mt-2 text-muted-foreground">
            Paste your first job posting — job analysis, match score, and
            tailored documents arrive in Phase 1.
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">
            Build your master candidate profile first — everything downstream
            (match scores, CVs, cover letters) is generated from it.
          </p>
        )}
        <Link
          href="/profile"
          className="mt-4 inline-block rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          {profile ? "Review profile" : "Build profile"}
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const body = (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}