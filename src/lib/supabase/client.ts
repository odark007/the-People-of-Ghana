// ─────────────────────────────────────────────────────────────────────────────
// Supabase clients — People of Ghana
//
// THREE client types, used in different contexts:
//   1. createBrowserClient()  → React components, hooks (uses anon key)
//   2. createServerClient()   → Server components, API routes (uses anon key + cookies)
//   3. createAdminClient()    → Server only, admin ops (uses service role key — NEVER client)
//
// The service role key BYPASSES all RLS. It is only used:
//   - OTP creation/validation (otp_codes table has deny-all RLS)
//   - Superadmin PII access (with audit log)
//   - Internal migrations/seeding
// ─────────────────────────────────────────────────────────────────────────────

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
// Database types placeholder — run `npm run db:generate-types` to generate
type Database = Record<string, unknown>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

// ── 1. Browser client (for use in React client components) ───────────────────
export function createBrowserClient() {
  return createSupabaseBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── 2. Server client (for Server Components and Route Handlers) ───────────────
export async function createServerClient() {
  const cookieStore = cookies();

  return createSupabaseServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server component — cookie setting handled by middleware
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Server component — handled by middleware
          }
        },
      },
    }
  );
}

// ── 3. Admin client (service role — SERVER ONLY, never import in client code) ─
export function createAdminClient() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This operation requires server-side admin access."
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ── Singleton browser client (cached for performance) ────────────────────────
let browserClientSingleton: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (!browserClientSingleton) {
    browserClientSingleton = createBrowserClient();
  }
  return browserClientSingleton;
}
