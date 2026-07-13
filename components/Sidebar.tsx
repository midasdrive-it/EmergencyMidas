"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </svg>
  );
}

function QuoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function ListIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

const MODULES = [
  {
    href: "/dashboard/calendario",
    label: "Calendario",
    icon: CalendarIcon,
    enabled: true,
  },
  {
    href: "/dashboard/preventivi",
    label: "Preventivi",
    icon: QuoteIcon,
    enabled: false,
  },
  {
    href: "/dashboard/distinte-lavori",
    label: "Distinte lavori",
    icon: ListIcon,
    enabled: false,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-4 pb-2 pt-5">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Moduli
        </p>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const active = pathname.startsWith(mod.href);

          if (!mod.enabled) {
            return (
              <span
                key={mod.href}
                title="Presto disponibile"
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted/60"
              >
                <Icon className="shrink-0" />
                <span className="truncate">{mod.label}</span>
                <span className="ml-auto rounded bg-line px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  presto
                </span>
              </span>
            );
          }

          return (
            <Link
              key={mod.href}
              href={mod.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                active
                  ? "bg-brand-tint font-semibold text-ink"
                  : "text-ink/70 hover:bg-paper hover:text-ink"
              }`}
            >
              <Icon className="shrink-0" />
              <span className="truncate">{mod.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line px-3 py-3">
        <SignOutButton className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-paper hover:text-rust" />
      </div>
    </aside>
  );
}
