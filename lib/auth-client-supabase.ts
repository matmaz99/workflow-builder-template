"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthSession = {
  user: {
    id: string;
    email: string | undefined;
    name: string | null;
    image: string | null;
  };
} | null;

type UseSessionReturn = {
  data: AuthSession;
  isPending: boolean;
};

// Create a singleton Supabase client for auth operations
const supabase = createClient();

/**
 * React hook for accessing the current auth session
 * Subscribes to auth state changes
 */
export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsPending(false);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsPending(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Transform Supabase session to match expected format
  const transformedSession: AuthSession = session
    ? {
        user: {
          id: session.user.id,
          email: session.user.email,
          name:
            session.user.user_metadata?.name ||
            session.user.user_metadata?.full_name ||
            null,
          image:
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture ||
            null,
        },
      }
    : null;

  return {
    data: transformedSession,
    isPending,
  };
}

/**
 * Sign in methods
 */
export const signIn = {
  /**
   * Sign in with OAuth provider
   */
  async social({
    provider,
    callbackURL,
  }: {
    provider: "github" | "google";
    callbackURL?: string;
  }) {
    const redirectTo = `${window.location.origin}/auth/callback${callbackURL ? `?next=${encodeURIComponent(callbackURL)}` : ""}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  },

  /**
   * Sign in with email and password
   */
  async email({ email, password }: { email: string; password: string }) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  },
};

/**
 * Sign up methods
 */
export const signUp = {
  /**
   * Sign up with email and password
   */
  async email({
    email,
    password,
    name,
  }: {
    email: string;
    password: string;
    name: string;
  }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          full_name: name,
        },
      },
    });

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  },
};

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign out error:", error.message);
  }
}

/**
 * Get the current user (for server-side usage simulation)
 */
export async function getUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
