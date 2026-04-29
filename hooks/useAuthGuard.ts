"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface UseAuthGuardOptions {
  redirectTo?: string;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { redirectTo = "/login" } = options;
  const router = useRouter();
  const { status } = useSession();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(redirectTo);
    } else if (status === "authenticated") {
      setIsReady(true);
    }
  }, [status, router, redirectTo]);

  return { isReady, status };
}