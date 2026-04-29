"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Info, Settings, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePasses } from "@/hooks/usePasses";
import { Pass } from "@/types";

export default function LogPage() {
  const router = useRouter();
  const path = usePathname();
  const { status } = useSession();
  const { passes, loading, error, refetch } = usePasses();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleFilterChange = useCallback((f: string) => {
    setFilter(f);
  }, []);

  const filteredLogs = useMemo(() => {
    return passes.filter((log: Pass) => {
      const matchSearch = log.place
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchFilter = filter === "All" || log.status === filter;
      return matchSearch && matchFilter;
    });
  }, [passes, search, filter]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#f4f1ea] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const statusColor = (status: string) => {
    if (status === "Active") return "bg-green-500";
    if (status === "Out") return "bg-purple-500";
    if (status === "Returned") return "bg-teal-500";
    if (status === "Pending") return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleLogClick = useCallback((passId: string) => {
    router.push(`/pass?id=${passId}`);
  }, [router]);

  return (
    <div className="mobile-shell-outer">

      {/* MOBILE FRAME */}
      <div className="mobile-shell">

        {/* 🔥 SAME ORANGE BG AS DASHBOARD */}
        <div className="absolute bottom-[-100px] right-[-50px] w-[500px] h-[350px] bg-gradient-to-r from-orange-400 to-orange-600 rounded-tl-[200px]" />

        {/* 🔥 MAIN CARD */}
        <div className="glass-card absolute top-[12%] left-1/2 w-[min(320px,calc(100%-32px))] -translate-x-1/2 rounded-3xl p-5 text-gray-800 animate-[slideUp_0.6s_ease, float_4s_ease-in-out_infinite]">

          {/* TOP BLOB */}
          <div className="absolute top-0 right-0 w-16 h-14 bg-orange-400 rounded-bl-[40px]" />

          {/* TITLE */}
          <h2 className="text-lg font-semibold text-gray-800 mt-2 mb-3">
            Logs
          </h2>

          {/* 🔍 SEARCH */}
          <input
            placeholder="Search logs..."
            value={search}
            onChange={handleSearchChange}
            className="w-full mb-3 p-3 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg mb-3">
              <AlertCircle size={16} />
              <p className="text-xs">{error}</p>
              <button onClick={refetch} className="ml-auto text-xs underline">Retry</button>
            </div>
          )}

          {/* 📊 FILTERS */}
          <div className="flex gap-2 mb-4 text-xs flex-wrap">
            {["All", "Active", "Out", "Returned", "Pending", "Expired"].map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-3 py-1 rounded-full transition ${
                  filter === f
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* 📋 LOG LIST */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">

            {filteredLogs.map((log: Pass, index: number) => (
              <div
                key={log._id || index}
                onClick={() => handleLogClick(log._id)}
                className="flex justify-between items-center p-3 rounded-xl bg-gray-100 hover:scale-[1.02] transition cursor-pointer"
              >
                <div>
                  <p className="font-medium text-sm">{log.place}</p>
                  <p className="text-xs text-gray-500">
                    Out: {log.timeOut}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    In: {log.timeIn}
                  </p>
                  <span
                    className={`${statusColor(
                      log.status
                    )} text-white text-xs px-2 py-1 rounded-full`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <p className="text-center text-sm text-gray-400">
                No logs found
              </p>
            )}
          </div>

        </div>

        {/* 🔥 SAME PREMIUM NAVBAR */}
        <div className="bottom-nav-shell absolute bottom-4 left-1/2 flex w-[min(320px,calc(100%-32px))] -translate-x-1/2 justify-around rounded-2xl py-3">

          {/* HOME */}
          <div
            onClick={() => router.push("/dashboard")}
            className={`flex flex-col items-center cursor-pointer ${
              path === "/dashboard" ? "text-orange-500" : "text-gray-400"
            }`}
          >
            <Home size={22} />
            <p className="text-[10px]">Home</p>
          </div>

          {/* LOG */}
          <div
            className={`flex flex-col items-center ${
              path === "/log" ? "text-orange-500" : "text-gray-400"
            }`}
          >
            <Info size={22} />
            <p className="text-[10px]">Log</p>
          </div>

          {/* SETTINGS */}
          <div
            onClick={() => router.push("/settings")}
            className={`flex flex-col items-center cursor-pointer ${
              path === "/settings" ? "text-orange-500" : "text-gray-400"
            }`}
          >
            <Settings size={22} />
            <p className="text-[10px]">Settings</p>
          </div>

        </div>

      </div>
    </div>
  );
}
