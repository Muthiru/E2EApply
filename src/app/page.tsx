import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

const features = [
  {
    title: "Honest match scores",
    body: "Paste a job, get a real score — including the reasons to skip it. No more time wasted on roles you were never going to get.",
    stat: "Fit"
  },
  {
    title: "Tailored documents",
    body: "CV and cover letter generated from your master candidate profile, tuned to each specific job description.",
    stat: "CV"
  },
  {
    title: "A tracker that closes the loop",
    body: "Applied → assessment → interview → offer or rejection. Know exactly where every application stands, and what to do next.",
    stat: "Loop"
  },
];

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="app-shell flex min-h-screen flex-col overflow-hidden">
      <header className="relative z-10 border-b border-border/80 bg-white/82 backdrop-blur-xl">
        <div className="app-container flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition-transform duration-300 group-hover:scale-105">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              E2E Apply
            </span>
          </Link>
          <div>
            <SignInButton mode="modal">
              <button className="btn btn-secondary min-h-9 px-4 py-2">
                Sign in
              </button>
            </SignInButton>
          </div>
        </div>
      </header>

      <main className="app-container relative z-10 flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-24">
        <div className="badge border-status-offer/30 text-status-offer">
          <span className="h-2 w-2 rounded-full bg-status-offer" />
          The intelligent job application OS
        </div>

        <h1 className="mt-8 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          From discovery to outcome. <br className="hidden sm:block" />
          <span className="text-primary">
            Not just another CV tool.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Paste a job, get an honest match score (and the reasons to skip it), a flawlessly tailored CV, and a smart tracker that truly closes the loop.
        </p>

        <div className="mb-14 mt-10 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <SignUpButton mode="modal">
            <button className="btn btn-primary w-full px-8 py-3.5 text-base sm:w-auto">
              <span className="relative z-10 flex items-center gap-2">
                Get started free
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
              </span>
            </button>
          </SignUpButton>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3 text-left">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="panel group relative overflow-hidden p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-soft)]"
            >
              <div className="mb-4 inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-primary/10 px-3 text-sm font-bold text-primary transition-transform group-hover:-translate-y-1">
                {feature.stat}
              </div>
              <h2 className="text-lg font-bold text-foreground">{feature.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/80 bg-white/82 backdrop-blur-xl">
        <div className="app-container flex flex-col gap-3 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
