import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

const features = [
  {
    title: "Honest match scores",
    body: "Paste a job, get a real score — including the reasons to skip it. No more time wasted on roles you were never going to get.",
    icon: "🎯"
  },
  {
    title: "Tailored documents",
    body: "CV and cover letter generated from your master candidate profile, tuned to each specific job description.",
    icon: "✨"
  },
  {
    title: "A tracker that closes the loop",
    body: "Applied → assessment → interview → offer or rejection. Know exactly where every application stands, and what to do next.",
    icon: "📊"
  },
];

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Minimal ambient glow background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-border/20 blur-3xl opacity-50" />
      </div>

      <header className="relative z-10 border-b/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-transform duration-300 group-hover:scale-105">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              E2E Apply
            </span>
          </Link>
          <div>
            {userId ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Sign in
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-24 text-center sm:py-32">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-sm font-medium text-foreground backdrop-blur-sm transition-all hover:bg-muted/60">
          <span className="flex h-2 w-2 rounded-full bg-status-offer animate-pulse" />
          The intelligent job application OS
        </div>

        <h1 className="mt-8 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl">
          From discovery to outcome. <br className="hidden sm:block" />
          <span className="text-muted-foreground/80">
            Not just another CV tool.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Paste a job, get an honest match score (and the reasons to skip it), a flawlessly tailored CV, and a smart tracker that truly closes the loop.
        </p>

        <div className="mt-10 mb-20 flex flex-col sm:flex-row items-center gap-4">
          {userId ? (
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-foreground px-8 py-3.5 text-base font-semibold text-background transition-all hover:scale-105 hover:shadow-lg hover:shadow-foreground/20 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                Open Dashboard
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
              </span>
            </Link>
          ) : (
            <SignUpButton mode="modal">
              <button className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-foreground px-8 py-3.5 text-base font-semibold text-background transition-all hover:scale-105 hover:shadow-lg hover:shadow-foreground/20 active:scale-95">
                <span className="relative z-10 flex items-center gap-2">
                  Get started free
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                </span>
                <div className="absolute inset-0 -z-10 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </button>
            </SignUpButton>
          )}
        </div>

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3 text-left">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border bg-background/50 p-8 shadow-sm backdrop-blur-sm transition-all hover:shadow-md hover:border-foreground/20"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-2xl transition-transform group-hover:-translate-y-1">
                {feature.icon}
              </div>
              <h2 className="text-lg font-bold text-foreground">{feature.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium">
            <div className="h-4 w-4 rounded-md bg-foreground text-background flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            E2E Apply
          </div>
          <span>Human-in-the-loop tracking</span>
        </div>
      </footer>
    </div>
  );
}