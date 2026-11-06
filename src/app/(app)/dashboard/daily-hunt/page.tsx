import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { matchBadgeClass } from "@/lib/status";
import { DailyHuntSubmitButton } from "@/components/daily-hunt/DailyHuntSubmitButton";
import { DeleteDailyHuntBatchButton } from "@/components/daily-hunt/DeleteDailyHuntBatchButton";
import { DailyHuntToast } from "@/components/daily-hunt/DailyHuntToast";
import { DailyHuntFlowerLoader } from "@/components/daily-hunt/DailyHuntFlowerLoader";
import {
  buildDailyHuntBatch,
  createDailyHuntBatch,
  saveDailyHuntMasterCv,
  trackDailyHuntItem,
} from "@/lib/actions/daily-hunt";

const PAGE_ERRORS: Record<string, string> = {
  batch: "That batch could not be found.",
  profile: "Build your profile before searching for jobs.",
  roles: "Choose target roles or add qualifications to your Profile or Master CV before searching.",
  search: "Job search is temporarily unavailable. Try again shortly.",
  mastercv: "That Master CV is unavailable. Choose one from your own Profile.",
  track: "Could not add this posting to Applications. Try again; it may already be tracked.",
};

export default async function DailyHuntPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string; batch?: string; mastercv?: string; tracked?: string; trackError?: string }>;
}>) {
  const { userId } = await auth.protect();
  const params = await searchParams;
  const [user, batches] = await Promise.all([
    prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        profile: {
          include: {
            preferences: true,
            masterCvs: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.dailyHuntBatch.findMany({
      where: { user: { clerkId: userId } },
      include: {
        items: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const profilePreferences = user?.profile?.preferences;

  return (
    <div className="page-stack">
      <header className="panel grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8">
        <div>
          <span className="eyebrow">A focused job-search workspace</span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Daily Hunt
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Find recent job openings that match your profile. Review each match, then track the opportunities you want to pursue.
          </p>
        </div>

        <form action={createDailyHuntBatch} className="lg:justify-self-end">
          <DailyHuntSubmitButton
            className="btn btn-primary min-h-11 w-full px-5 sm:w-auto"
            idleLabel="New batch"
            pendingLabel="Creating batch…"
            pendingMessage="Preparing a new Daily Hunt workspace."
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path d="M10 4.167v11.666M4.167 10h11.666" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </DailyHuntSubmitButton>
        </form>
      </header>

      {params.error && PAGE_ERRORS[params.error] && (
        <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {PAGE_ERRORS[params.error]}
        </p>
      )}
      <DailyHuntToast
        show={Boolean(params.mastercv)}
        message="Master CV selection saved for this batch."
        queryParam="mastercv"
      />
      <DailyHuntToast
        show={Boolean(params.batch && !params.error)}
        message="Search finished. Results are saved in the selected batch for review."
        queryParam="batch"
      />
      {params.tracked && (
        <p role="status" className="rounded-lg border border-status-offer/30 bg-status-offer/5 px-4 py-3 text-sm text-status-offer">
          Job added to Applications as Pending. It has not been marked as applied.
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.75fr)]">
        <section className="panel p-5 sm:p-6" aria-labelledby="batch-list-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="batch-list-heading" className="text-lg font-semibold text-foreground">
                Your batches
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Track selected jobs in Applications as Pending, then prepare them when you’re ready.
              </p>
            </div>
            <span className="badge border-border text-muted-foreground">
              {batches.length} {batches.length === 1 ? "batch" : "batches"}
            </span>
          </div>

          {batches.length === 0 ? (
            <div className="panel-soft mt-5 flex min-h-56 flex-col items-center justify-center rounded-xl px-5 py-9 text-center sm:px-8">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-white text-primary shadow-sm">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                  <path d="M4.75 6.75h14.5v12.5H4.75zM8 4.75v4M16 4.75v4M4.75 10.25h14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m9 15 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">Create your first batch</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Start a separate search session. Jobs found here won’t be added to Applications unless you choose them in a later step.
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-4">
              {batches.map((batch) => {
                const matched = batch.items.filter((item) => item.screeningStatus === "MATCHED").length;
                const review = batch.items.filter((item) => item.screeningStatus === "REVIEW").length;
                const excluded = batch.items.filter((item) => item.screeningStatus === "EXCLUDED").length;
                const visibleSearchWarnings = batch.items.length > 0
                  ? batch.searchWarnings.filter((warning) =>
                      !/search was unavailable|search was incomplete/i.test(warning),
                    )
                  : batch.searchWarnings;

                return (
                  <li key={batch.id} className="daily-hunt-batch min-w-0 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            Hunt batch · {batch.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </h3>
                          <span className="badge border-border text-muted-foreground">
                            {batch.status.charAt(0) + batch.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {batch.searchedAt
                            ? `Last searched ${batch.searchedAt.toLocaleString("en-GB")}`
                            : `Target: ${batch.targetCount} jobs · Not searched yet`}
                        </p>
                      </div>
                      <div className="flex w-full items-start justify-between gap-2 sm:w-auto sm:justify-start">
                        <form action={buildDailyHuntBatch.bind(null, batch.id)}>
                          <DailyHuntSubmitButton
                            className="btn btn-primary min-h-9 w-auto px-3 py-2 text-xs"
                            idleLabel={batch.searchedAt ? "Search again" : "Find jobs"}
                            pendingLabel="Searching…"
                            pendingMessage="Checking job sources, location, and CV match. This may take a little while."
                            batchSearch
                          />
                        </form>
                        <DeleteDailyHuntBatchButton batchId={batch.id} />
                      </div>
                    </div>

                    <form action={saveDailyHuntMasterCv.bind(null, batch.id)} className="mt-4 w-full min-w-0 max-w-full rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
                      <label htmlFor={`master-cv-${batch.id}`} className="block text-sm font-medium text-foreground">
                        Master CV for this batch
                      </label>
                      <div className="mt-2 grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <select
                          id={`master-cv-${batch.id}`}
                          name="masterCvId"
                          defaultValue={batch.masterCvId ?? ""}
                          className="field-control block w-full min-w-0 max-w-full truncate"
                        >
                          <option value="">No Master CV selected</option>
                          {user?.profile?.masterCvs.map((masterCv) => (
                            <option key={masterCv.id} value={masterCv.id}>{masterCv.name}</option>
                          ))}
                        </select>
                        <button className="btn btn-secondary w-full min-w-0 sm:w-auto" type="submit">Save selection</button>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Qualifications from this CV guide the search, and readable job postings are scored against it. Your target roles and locations still guide where the hunt looks. This does not change CV selections on existing applications.
                      </p>
                      {user?.profile?.masterCvs.length === 0 && (
                        <Link href="/profile" className="mt-2 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline">
                          Add a Master CV in Profile
                        </Link>
                      )}
                    </form>

                    <div className="daily-hunt-search-results mt-4">
                      <div className="daily-hunt-search-results-content">
                        {batch.searchedAt ? (
                          <>
                            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                          <span className="badge border-status-offer/30 bg-status-offer/5 text-status-offer">{matched} matched</span>
                          <span className="badge border-status-assessment/30 bg-status-assessment/5 text-status-assessment">{review} to review</span>
                          <span className="badge border-status-rejected/30 bg-status-rejected/5 text-status-rejected">{excluded} excluded</span>
                            </div>
                            {visibleSearchWarnings.length > 0 && (
                              <p className="mt-3 rounded-lg border border-status-assessment/30 bg-status-assessment/5 px-3 py-2 text-xs text-muted-foreground">
                                {visibleSearchWarnings.join(" · ")}
                              </p>
                            )}
                            {batch.items.length === 0 ? (
                              <p className="mt-4 rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
                                No jobs to show for this search. Try again later or adjust your target roles or location in Profile.
                              </p>
                            ) : (
                              <ul className="mt-4 space-y-3">
                                {batch.items.map((item) => (
                                  <li key={item.id} className="rounded-lg border border-border/80 bg-muted/20 p-3 sm:p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline-offset-2 hover:underline">
                                          {item.title}<span className="sr-only"> (opens in a new tab)</span>
                                        </a>
                                        {item.company && <p className="mt-1 text-sm text-muted-foreground">{item.company}</p>}
                                      </div>
                                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                                        <span className={`badge ${screeningBadgeClass(item.screeningStatus)}`}>
                                          {screeningLabel(item.screeningStatus)}
                                        </span>
                                        {hasCvFitScore(item.estimatedMatch, item.screeningReasons) ? (
                                          <span className={`badge ${matchBadgeClass(item.estimatedMatch)}`}>
                                            {item.estimatedMatch}%
                                          </span>
                                        ) : (
                                          <span className="badge border-border text-muted-foreground">No score</span>
                                        )}
                                      </div>
                                    </div>
                                    {primaryScreeningReason(item.screeningReasons) && (
                                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                        {primaryScreeningReason(item.screeningReasons)}
                                      </p>
                                    )}
                                    {params.trackError === item.id && (
                                      <p role="alert" className="mt-2 text-xs text-error">{PAGE_ERRORS.track}</p>
                                    )}
                                    <div className="mt-3 flex justify-end">
                                      {item.applicationId ? (
                                        <Link href={`/dashboard/applications/${item.applicationId}`} className="btn btn-secondary min-h-8 px-3 py-1.5 text-xs">
                                          Open tracked application
                                        </Link>
                                      ) : (
                                        <form action={trackDailyHuntItem.bind(null, batch.id, item.id)}>
                                          <DailyHuntSubmitButton
                                            className="btn btn-secondary min-h-8 px-3 py-1.5 text-xs"
                                            idleLabel="Track job"
                                            pendingLabel="Tracking…"
                                            pendingMessage="Adding this job to Applications as Pending."
                                          />
                                        </form>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <p className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
                            Search this batch to see fresh job postings matched to your profile.
                          </p>
                        )}
                      </div>
                      <div className="daily-hunt-loading-cover" role="status" aria-live="polite">
                        <DailyHuntFlowerLoader className="h-14 w-14" />
                        <span className="max-w-sm text-sm font-medium text-foreground">
                          Checking fresh job postings, locations, and CV matches…
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="panel p-5 sm:p-6" aria-labelledby="workflow-heading">
          <span className="eyebrow">Your job search</span>
          <h2 id="workflow-heading" className="mt-2 text-lg font-semibold text-foreground">
            Find, review, and track
          </h2>
          <ol className="mt-5 space-y-5">
            <WorkflowStep number="01" title="Find recent jobs" detail="Search for openings that match your profile and location." state="Available" />
            <WorkflowStep number="02" title="Review your matches" detail="Check each job and its CV match score." state="Available" />
            <WorkflowStep number="03" title="Track the ones you like" detail="Add selected jobs to Applications as Pending." state="Available" />
          </ol>
          <p className="mt-6 rounded-lg bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
            Jobs are never submitted automatically. You choose which ones to track.
          </p>
          {!(profilePreferences?.preferredRoles.length) && !user?.profile?.title && (
            <Link href="/profile" className="btn btn-secondary mt-4 w-full">Set your target roles</Link>
          )}
        </aside>
      </div>
    </div>
  );
}

function screeningLabel(status: string): string {
  if (status === "MATCHED") return "Matched";
  if (status === "EXCLUDED") return "Excluded";
  return "Review";
}

function screeningBadgeClass(status: string): string {
  if (status === "MATCHED") return "border-status-offer/30 bg-status-offer/5 text-status-offer";
  if (status === "EXCLUDED") return "border-status-rejected/30 bg-status-rejected/5 text-status-rejected";
  return "border-status-assessment/30 bg-status-assessment/5 text-status-assessment";
}

function primaryScreeningReason(reasons: string[]): string | null {
  return reasons.find((reason) => !reason.startsWith("No configured screening concerns")) ?? null;
}

function hasCvFitScore(score: number | null, reasons: string[]): score is number {
  return score !== null && reasons.some((reason) => reason.startsWith("CV fit:"));
}

function WorkflowStep({
  number,
  title,
  detail,
  state,
}: {
  number: string;
  title: string;
  detail: string;
  state: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-xs font-bold text-muted-foreground">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">{state}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}
