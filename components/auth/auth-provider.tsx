"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isPending) {
        router.push("/login");
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isPending, router]);

  useEffect(() => {
    if (!(isPending || session) && pathname !== "/login") {
      router.push("/login");
    }
  }, [session, isPending, router, pathname]);

  // Clear cached data when user changes (sign in/out/up)
  useEffect(() => {
    const currentUserId = session?.user?.id ?? null;

    // If user ID changed (sign in, sign out, or different user)
    if (previousUserIdRef.current !== currentUserId) {
      // Clear cached projects and workflow data
      localStorage.removeItem("vercel-projects");
      localStorage.removeItem("selected-project-id");
      localStorage.removeItem("workflow-prompt");

      // Update ref for next comparison
      previousUserIdRef.current = currentUserId;
    }
  }, [session]);

  // Show error if session check failed
  if (error) {
    if (pathname !== "/login") {
      router.push("/login");
    }
    return null;
  }

  // Don't block rendering while checking auth
  // The content will show immediately, and we'll redirect if needed
  return <>{children}</>;
}
