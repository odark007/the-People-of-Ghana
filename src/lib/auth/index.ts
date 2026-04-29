// ─────────────────────────────────────────────────────────────────────────────
// Auth Library — People of Ghana
// Supabase email + password auth only. No OTP. No phone. No Twilio.
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient, createAdminClient } from "@/lib/supabase/client";
import { generatePseudonym } from "@/lib/anonymization";
import type { UserRole, AnonymityLevel } from "@/types";

export async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getProfile() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, role, anonymity_level, public_name, consent_given_at, is_verified, deleted_at")
    .eq("id", user.id)
    .single();

  return data as {
    id: string;
    role: UserRole;
    anonymity_level: AnonymityLevel;
    public_name: string;
    consent_given_at: string | null;
    is_verified: boolean;
    deleted_at: string | null;
  } | null;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile) throw new Error("UNAUTHORIZED");
  if (!["admin", "superadmin"].includes(profile.role)) throw new Error("FORBIDDEN");
  return profile;
}

/**
 * Creates public.users row after first Supabase Auth sign-in.
 * Idempotent — safe to call on every sign-in.
 */
export async function syncUserProfile(authUserId: string): Promise<{
  isNewUser: boolean;
  needsConsent: boolean;
}> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("users")
    .select("id, consent_given_at")
    .eq("id", authUserId)
    .single();

  if (existing) {
    return { isNewUser: false, needsConsent: !existing.consent_given_at };
  }

  const pseudonym = generatePseudonym();

  const { error } = await supabase.from("users").insert({
    id: authUserId,
    anonymity_level: "L1",
    pseudonym,
    public_name: "Anonymous Citizen",
    is_verified: true,
    role: "user",
    consent_given_at: null,
  });

  if (error && error.code === "23505") {
    return { isNewUser: false, needsConsent: true };
  }
  if (error) throw new Error(`Failed to create user profile: ${error.message}`);

  return { isNewUser: true, needsConsent: true };
}
