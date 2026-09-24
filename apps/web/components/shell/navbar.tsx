"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/auth/actions";
import {
  IconBell,
  IconChart,
  IconChevronDown,
  IconClose,
  IconGrid,
  IconLogout,
  IconMenu,
  IconPlusSquare,
  IconSearch,
} from "@/components/ui/icons";

/**
 * Candidate navbar from the reference: white bar, Assessment.ai wordmark,
 * centred icon links with an active blue underline, and a right cluster
 * (search, bell, avatar + user menu).
 *
 * This is a client island only because active-link state, the mobile menu and
 * the user dropdown need interactivity; it receives the identity as props
 * from the server layout (session-derived, never from the browser).
 */
const LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: IconGrid },
  { href: "/assessments", label: "New Assessment", Icon: IconPlusSquare },
  { href: "/results", label: "My Results", Icon: IconChart },
];

export function Navbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the user menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => setMobileOpen(false), [pathname]);

  const initials = userEmail
    .split("@")[0]
    .split(/[._-]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  const navLink = (href: string, label: string, Icon: typeof IconGrid, mobile = false) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    if (mobile) {
      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
            active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </Link>
      );
    }
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative flex items-center gap-2 px-1 py-5 text-sm font-semibold transition-colors ${
          active ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
        {label}
        <span
          aria-hidden
          className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full transition-colors ${
            active ? "bg-blue-600" : "bg-transparent"
          }`}
        />
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="text-xl font-extrabold tracking-tight text-slate-900">
          Assessment<span className="text-blue-600">.ai</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => navLink(l.href, l.label, l.Icon))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Search arrives with the library phases"
            aria-label="Search (coming soon)"
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <IconSearch className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Notifications arrive in a later phase"
            aria-label="Notifications (coming soon)"
            className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <IconBell className="h-5 w-5" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="ml-1 flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-slate-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {initials || "U"}
              </span>
              <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-800 sm:block">
                {userEmail.split("@")[0]}
              </span>
              <IconChevronDown className="h-4 w-4 text-slate-500" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{userEmail}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Candidate account</p>
                </div>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <IconLogout className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            {mobileOpen ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile" className="space-y-1 border-t border-slate-200 px-4 py-3 md:hidden">
          {LINKS.map((l) => navLink(l.href, l.label, l.Icon, true))}
        </nav>
      )}
    </header>
  );
}
