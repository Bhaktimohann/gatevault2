"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

interface UseAuthGuardOptions {
  redirectTo?: string;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { redirectTo = "/login" } = options;
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(redirectTo);
    }
  }, [status, router, redirectTo]);

  return { isReady: status === "authenticated", status };
}
