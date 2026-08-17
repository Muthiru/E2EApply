import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

const features = [
  {
    title: "Honest match scores",
    body: "Paste a job, get a real score — including the reasons to skip it. No more time wasted on roles you were never going to get.",
  },
  {
    title: "Tailored documents",
    body: "CV and cover letter generated from your master candidate profile, tuned to each specific job description.",
  },
  {
    title: "A tracker that closes the loop",
    body: "Applied → assessment → interview → offer or rejection. Know exactly where every application stands, and what to do next.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            E2E Apply
          </Link>
          <div>
            {userId ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              >
                Open dashboard
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button className="rounded-md border px-4 py-2 text-sm font-medium">
                  Sign in
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
        <section className="flex flex-col items-center gap-6 text-center">
          <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Your job application OS
          </span>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            From job discovery to outcome. Not just another CV generator.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Paste a job, get an honest match score (including the reasons to
            skip it), tailored CV and cover letter, and a tracker that closes
            the loop — from applied to rejected, interview, or offer.
          </p>
          <div className="flex gap-3">
            {userId ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground">
                    Get started free
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="rounded-md border px-5 py-2.5 text-sm font-medium">
                    Sign in
                  </button>
                </SignInButton>
              </>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border p-6 transition-colors hover:border-accent"
            >
              <h2 className="text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 text-xs text-muted-foreground">
          <span>E2E Apply</span>
          <span>Human-in-the-loop application tracking</span>
        </div>
      </footer>
    </div>
  );
}