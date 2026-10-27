"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";

function DropMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden="true">
      <path
        d="M8 1.2c2.6 3.4 5.4 6.6 5.4 10A5.4 5.4 0 0 1 8 16.6a5.4 5.4 0 0 1-5.4-5.4c0-3.4 2.8-6.6 5.4-10Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await logout();
    router.push("/");
  }

  return (
    <div className="shell">
      <header className="topbar no-print">
        <div className="container topbar-inner">
          <Link href={user ? "/dashboard" : "/"} className="brand">
            <span className="brand-mark">
              <DropMark />
            </span>
            RainWise
          </Link>

          <nav className="nav-links" aria-label="Main">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}
                >
                  Properties
                </Link>
                <Link
                  href="/assessments"
                  className={`nav-link hide-mobile ${
                    pathname.startsWith("/assessments") ? "active" : ""
                  }`}
                >
                  History
                </Link>
                <div className="nav-user">
                  <span className="avatar" title={user.email}>
                    {initials(user.full_name, user.email)}
                  </span>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={signOut}>
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="nav-link">
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="page-pad">{children}</main>

      <footer className="footer no-print">
        <div className="container footer-inner">
          <span>RainWise · Preliminary rooftop rainwater harvesting assessment</span>
          <span>Not a substitute for professional engineering review.</span>
        </div>
      </footer>
    </div>
  );
}
