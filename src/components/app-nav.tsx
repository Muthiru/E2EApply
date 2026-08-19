"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 text-xs sm:gap-1 sm:text-sm">
      {navItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" &&
            pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "rounded-md border border-foreground/20 px-2 py-1 font-medium sm:px-3 sm:py-1.5"
                : "rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground sm:px-3 sm:py-1.5"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}