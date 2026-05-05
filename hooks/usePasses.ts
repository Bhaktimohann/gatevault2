import { useState, useEffect, useCallback } from "react";

const PASS_REFRESH_INTERVAL_MS = 2000;

interface Pass {
  _id: string;
  user: string;
  phone: string;
  place: string;
  purpose: string;
  passType?: "Short" | "LongLeave";
  leaveStartDate?: string;
  leaveEndDate?: string;
  timeOut: string;
  timeIn: string;
  person?: string;
  personPhone?: string;
  status: "Active" | "Out" | "Returned" | "Expired" | "Pending" | "Cancelled";
  shortPassStatus?: "Active" | "Overdue" | "On Time" | "On Time (Grace)" | "Late" | "Invalid Short Pass";
  allowedDurationHours?: number;
  graceMinutes?: number;
  expectedReturnTime?: string;
  totalDurationMinutes?: number | null;
  lateDurationMinutes?: number | null;
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  hodApprovalStatus?: "NotRequired" | "Pending" | "Approved" | "Rejected";
  scannedOutAt?: string;
  scannedInAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UsePassesReturn {
  passes: Pass[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePasses(enabled = true): UsePassesReturn {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPasses = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/passes?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch passes");
      const data = await res.json();
      setPasses(data.passes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchPasses(true);
  }, [enabled, fetchPasses]);

  useEffect(() => {
    if (!enabled) return;

    const refreshOnFocus = () => {
      fetchPasses();
    };

    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchPasses();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("pageshow", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    const interval = window.setInterval(fetchPasses, PASS_REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("pageshow", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
      window.clearInterval(interval);
    };
  }, [enabled, fetchPasses]);

  return { passes, loading, error, refetch: fetchPasses };
}
