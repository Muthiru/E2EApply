import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { matchBadgeClass, statusLabel } from "@/lib/status";
import type { JobMatchDetails } from "@/lib/job/score";
import type { CvAlignmentCheck } from "@/lib/job/cvAlignment";
import { ScoreButton } from "@/components/applications/score-button";
import { ScoreLoadingBoundary } from "@/components/applications/ScoreLoadingBoundary";
import { DocumentPanel } from "@/components/applications/document-panel";
import { StatusControl } from "@/components/applications/status-control";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth.protect();
  const { id } = await params;

  const application = await prisma.application.findFirst({
    where: { id, user: { clerkId: userId } },
    include: {
      job: true,
      statusEvents: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { version: "desc" } },
      masterCv: true,
      user: { include: { profile: { include: { masterCvs: true, projects: true } } } },
    },
  });

  if (!application) notFound();

  const job = application.job;
  const details = (job.matchDetails ?? null) as JobMatchDetails | null;
  const latestCv = application.documents.find((d) => d.type === "CV") ?? null;
  const latestCl =
    application.documents.find((d) => d.type === "COVER_LETTER") ?? null;

  return (
    <div className="page-stack min-w-0">
      <div className="flex min-w-0 max-w-full items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Application detail</p>
          <h1 className="mt-2 break-words text-2xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">{job.title}</h1>
          <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere] sm:text-base">
            {[job.company, job.location].filter(Boolean).join(" · ") || "Company unknown"}
            {job.salaryMin !== null && job.salaryMax !== null
              ? ` · $${job.salaryMin.toLocaleString()}–$${job.salaryMax.toLocaleString()}`
              : ""}
          </p>
        </div>
        <Link
          href="/dashboard/applications"
          aria-label="Close and return to applications"
          className="btn btn-secondary h-10 min-h-0 w-10 shrink-0 p-0"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </Link>
      </div>

      <ScoreLoadingBoundary>
      <section className="panel min-w-0 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between max-w-full">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Match score</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              How this job fits your master profile.
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
            {job.matchScore !== null && (
              <span
                className={`badge self-start px-3 py-2 text-base ${matchBadgeClass(job.matchScore)}`}
              >
                {job.matchScore}%
              </span>
            )}
            <ScoreButton
              applicationId={application.id}
              masterCvs={application.user.profile?.masterCvs ?? []}
              selectedCvId={application.masterCvId}
              hasScore={job.matchScore !== null}
            />
          </div>
        </div>

        {job.matchScore !== null && details && (
          <div className="mt-4 space-y-4">
            <p className="break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{job.matchReasoning}</p>

            {details.recommendation === "skip" && (
              <div className="rounded-md border border-status-rejected/40 bg-status-rejected/5 p-3 text-sm text-status-rejected">
                <strong>Why you might skip this:</strong> below the fit bar and
                the AI recommends passing on it.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  You have
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {details.matchedSkills.length > 0 ? (
                    details.matchedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="break-words rounded-full border border-status-offer/40 px-2.5 py-0.5 text-xs font-medium text-status-offer"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None listed</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Missing
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {details.missingSkills.length > 0 ? (
                    details.missingSkills.map((skill) => (
                      <span
                        key={skill}
                        className="break-words rounded-full border border-status-rejected/40 px-2.5 py-0.5 text-xs font-medium text-status-rejected"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No clear gaps
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
      </ScoreLoadingBoundary>

      <DocumentPanel
        applicationId={application.id}
        cv={
          latestCv
            ? {
              text: latestCv.content ?? "",
              version: latestCv.version,
              isFinal: latestCv.isFinal,
              alignment: (latestCv.alignmentDetails ?? null) as CvAlignmentCheck | null,
            }
            : null
        }
        coverLetter={
          latestCl
            ? {
              text: latestCl.content ?? "",
              version: latestCl.version,
              isFinal: latestCl.isFinal,
            }
            : null
        }
        header={{
          fullName: application.user.profile?.fullName ?? null,
          title: application.user.profile?.title ?? null,
          location: application.user.profile?.location ?? null,
          email: application.user.profile?.email ?? null,
          phone: application.user.profile?.phone ?? null,
          website: application.user.profile?.website ?? null,
          github: application.user.profile?.github ?? null,
          linkedin: application.user.profile?.linkedin ?? null,
        }}
        cvTemplate={application.cvTemplate ?? "classic"}
        clTemplate={application.clTemplate ?? "classic"}
        masterCvText={application.masterCv?.textContent ?? null}
        projects={application.user.profile?.projects.map((project) => ({ name: project.name, url: project.url })) ?? []}
      />

      <section className="panel min-w-0 p-4 sm:p-6">
        <h2 className="font-semibold">Job details</h2>
        <div className="mt-3 space-y-4 text-sm">
          {job.description && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="mt-1 whitespace-pre-line break-words leading-relaxed [overflow-wrap:anywhere]">
                {job.description}
              </p>
            </div>
          )}
          {job.requirements && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Requirements
              </p>
              <p className="mt-1 whitespace-pre-line break-words leading-relaxed [overflow-wrap:anywhere]">
                {job.requirements}
              </p>
            </div>
          )}
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              Original posting
            </a>
          )}
        </div>
      </section>

      <section className="panel min-w-0 p-4 sm:p-6">
        <h2 className="font-semibold">Status history</h2>
        <StatusControl
          applicationId={application.id}
          current={application.status}
        />
        {application.statusEvents.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No status changes yet — the tracker records them as you update it.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {application.statusEvents.map((event) => (
              <li key={event.id} className="flex flex-col justify-between gap-1 border-b border-border pb-3 last:border-0 sm:flex-row sm:gap-4">
                <span>
                  {event.from
                    ? `${statusLabel(event.from)} → ${statusLabel(event.to)}`
                    : statusLabel(event.to)}
                  {event.note && (
                    <span className="block text-xs text-muted-foreground">
                      {event.note}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {event.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
