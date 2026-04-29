"use client";

import { useEffect, useState, useCallback } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { AnonymityLevel, UserRole } from "@/types";

interface Profile {
  id: string;
  role: UserRole;
  anonymity_level: AnonymityLevel;
  public_name: string;
  consent_given_at: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasConsent: boolean;
}

export function useAuth() {
  const supabase = getBrowserClient();
  const [state, setState] = useState<AuthState>({
    user: null, profile: null, session: null,
    isLoading: true, isAuthenticated: false, hasConsent: false,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from("users")
      .select("id, role, anonymity_level, public_name, consent_given_at")
      .eq("id", userId)
      .single();
    return data as Profile | null;
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const profile = await fetchProfile(user.id);
    setState((p) => ({ ...p, profile, hasConsent: !!profile?.consent_given_at }));
  }, [supabase, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ user: session.user, profile, session, isLoading: false, isAuthenticated: true, hasConsent: !!profile?.consent_given_at });
      } else {
        setState((p) => ({ ...p, isLoading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ user: session.user, profile, session, isLoading: false, isAuthenticated: true, hasConsent: !!profile?.consent_given_at });
      } else {
        setState({ user: null, profile: null, session: null, isLoading: false, isAuthenticated: false, hasConsent: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    await supabase.auth.signOut();
  }, [supabase]);

  return { ...state, signOut, refreshProfile };
}
