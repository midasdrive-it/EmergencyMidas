"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/calendario", label: "Calendario", enabled: true },
  { href: "/dashboard/preventivi", label: "Preventivi", enabled: false },
  {
    href: "/dashboard/distinte-lavori",
    label: "Distinte lavori",
    enabled: false,
  },
];

export default function TabsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line px-4 sm:px-6">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        if (!tab.enabled) {
          return (
            <span
              key={tab.href}
              title="Presto disponibile"
              className="flex shrink-0 cursor-not-allowed items-center gap-1.5 border-b-2 border-transparent px-3 py-3 font-display text-sm uppercase tracking-wide text-muted/60"
            >
              {tab.label}
              <span className="rounded bg-line px-1.5 py-0.5 text-[10px] font-body normal-case tracking-normal text-muted">
                presto
              </span>
            </span>
          );
        }
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 border-b-2 px-3 py-3 font-display text-sm uppercase tracking-wide transition ${
              active
                ? "border-rust text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
