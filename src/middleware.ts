// ─────────────────────────────────────────────────────────────────────────────
// Middleware — People of Ghana
// Refreshes Supabase session, protects routes, enforces consent gate.
// Auth: email + password via Supabase. No OTP/phone.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseSSR } from "@supabase/ssr";

const PROTECTED_PREFIXES = [
  "/dashboard", "/directory", "/reports", "/feed", "/profile", "/search",
  "/api/reports", "/api/posts", "/api/auth/consent", "/api/auth/signout",
];
const ADMIN_PREFIXES    = ["/admin", "/api/admin", "/api/officials"];
const AUTH_PAGES        = ["/login"];
const CONSENT_EXEMPT    = ["/consent", "/login", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request: { headers: request.headers } });

  // Build SSR Supabase client that can refresh session cookies
  const supabase = createSupabaseSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
cookies: {
        get(name: string)                               { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: Record<string, unknown>)  {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh session (extends token lifetime silently)
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protect authenticated routes
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Consent gate
  if (isAuthenticated && !CONSENT_EXEMPT.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from("users")
      .select("consent_given_at, deleted_at")
      .eq("id", user.id)
      .single();

    if (profile?.deleted_at) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=account_deleted", request.url));
    }
    if (profile && !profile.consent_given_at && pathname !== "/consent") {
      return NextResponse.redirect(new URL("/consent", request.url));
    }
  }

  // Admin route protection
  if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!isAuthenticated) return NextResponse.redirect(new URL("/login", request.url));

    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user!.id).single();

    if (!profile || !["admin", "superadmin"].includes(profile.role)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
