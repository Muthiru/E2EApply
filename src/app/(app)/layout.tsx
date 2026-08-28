import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import AppNav from "@/components/app-nav";
import { ensureUser } from "@/lib/user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth.protect();
  await ensureUser(userId);
  return (
    <div className="app-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-white/86 backdrop-blur-xl supports-[backdrop-filter]:bg-white/72">
        <div className="app-container flex flex-wrap items-center justify-between gap-3 py-3 sm:flex-nowrap sm:py-4">
          <Link 
            href="/dashboard" 
            className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight text-foreground transition-colors hover:text-primary"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-black text-white shadow-sm">
              E2E
            </span>
            <span>Apply</span>
          </Link>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <AppNav />
            <UserButton
              appearance={{
                elements: { 
                  avatarBox: "h-9 w-9 ring-2 ring-border ring-offset-2 ring-offset-background"
                },
              }}
            />
          </div>
        </div>
      </header>
      <main className="app-container w-full flex-1 py-5 sm:py-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
