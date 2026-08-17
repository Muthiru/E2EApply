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
    <nav className="flex items-center gap-1 text-sm">
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
                ? "rounded-md border border-foreground/20 px-3 py-1.5 font-medium"
                : "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}