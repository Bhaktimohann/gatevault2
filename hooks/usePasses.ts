import { useState, useEffect, useCallback } from "react";

interface Pass {
  _id: string;
  user: string;
  phone: string;
  place: string;
  purpose: string;
  timeOut: string;
  timeIn: string;
  person?: string;
  personPhone?: string;
  status: "Active" | "Expired" | "Pending";
  createdAt: string;
  updatedAt: string;
}

interface UsePassesReturn {
  passes: Pass[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePasses(): UsePassesReturn {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/passes");
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
    fetchPasses();
  }, [fetchPasses]);

  return { passes, loading, error, refetch: fetchPasses };
}