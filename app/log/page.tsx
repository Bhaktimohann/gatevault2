"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Info, Settings, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePasses } from "@/hooks/usePasses";
import { Pass } from "@/types";

function getLogLabel(log: Pass) {
  if (log.status === "Cancelled") return "Cancelled";
  if (log.passType === "Short" && log.shortPassStatus) return log.shortPassStatus;
  if (log.hodApprovalStatus === "Pending") return "HOD Approval";
  if (log.hodApprovalStatus === "Rejected") return "HOD Rejected";
  if (log.passType === "LongLeave" && log.wardenApprovalStatus === "Pending") return "Warden Approval";
  if (log.passType === "LongLeave" && log.wardenApprovalStatus === "Rejected") return "Warden Rejected";
  if (log.approvalStatus === "Pending") return "Awaiting Approval";
  if (log.approvalStatus === "Rejected") return "Rejected";
  if (log.status === "Out") return "Out";
  if (log.status === "Returned") return "Returned";
  if (log.status === "Expired") return "Expired";
  if (log.status === "Active") return "Approved";
  return log.status;
}

function getLogColor(label: string) {
  if (label === "Approved") return "bg-green-500";
  if (label === "On Time" || label === "On Time (Grace)") return "bg-green-500";
  if (label === "Out") return "bg-purple-500";
  if (label === "Returned") return "bg-teal-500";
  if (label === "Cancelled") return "bg-gray-500";
  if (label === "Awaiting Approval" || label === "HOD Approval" || label === "Warden Approval") return "bg-yellow-500";
  if (label === "Rejected" || label === "HOD Rejected" || label === "Warden Rejected" || label === "Expired" || label === "Overdue" || label === "Late" || label === "Invalid Short Pass") return "bg-red-500";
  return "bg-gray-500";
}

function getLogMeta(log: Pass) {
  if (log.scannedInAt) {
    return `Returned: ${new Date(log.scannedInAt).toLocaleString()}`;
  }

  if (log.status === "Cancelled") {
    return "Pass cancelled by student";
  }

  if (log.scannedOutAt) {
    return `Scanned out: ${new Date(log.scannedOutAt).toLocaleString()}`;
  }

  if (log.approvalStatus === "Rejected") {
    return "Pass rejected";
  }

  if (log.hodApprovalStatus === "Rejected") {
    return "Long leave rejected by HOD";
  }

  if (log.wardenApprovalStatus === "Rejected") {
    return "Long leave rejected by warden";
  }

  if (log.hodApprovalStatus === "Pending") {
    return "Waiting for HOD approval";
  }

  if (log.passType === "LongLeave" && log.wardenApprovalStatus === "Pending") {
    return "Waiting for warden approval";
  }

  if (log.approvalStatus === "Pending") {
    return log.passType === "LongLeave" ? "Waiting for warden approval" : "Waiting for admin approval";
  }

  return `Requested: ${new Date(log.createdAt).toLocaleDateString()}`;
}

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

  const handleLogClick = useCallback((passId: string) => {
    router.push(`/pass?id=${passId}`);
  }, [router]);

  const filteredLogs = useMemo(() => {
    return passes.filter((log: Pass) => {
      const label = getLogLabel(log);
      const searchText = [log.place, log.purpose, label, log.passType].filter(Boolean).join(" ").toLowerCase();
      const matchSearch = searchText.includes(search.toLowerCase());
      const matchFilter = filter === "All" || label === filter;
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

  return (
    <div className="mobile-shell-outer">

      {/* MOBILE FRAME */}
      <div className="mobile-shell">

        {/* 🔥 SAME ORANGE BG AS DASHBOARD */}
        <div className="absolute bottom-[-100px] right-[-50px] w-[500px] h-[350px] bg-gradient-to-r from-orange-400 to-orange-600 rounded-tl-[200px]" />

        {/* 🔥 MAIN CARD */}
        <div className="glass-card absolute left-1/2 top-8 flex max-h-[calc(100%-112px)] w-[min(340px,calc(100%-32px))] -translate-x-1/2 flex-col rounded-3xl p-5 text-gray-800 animate-[slideUp_0.6s_ease, float_4s_ease-in-out_infinite] sm:w-[min(680px,calc(100%-64px))]">

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
          <div className="mb-4 flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1 text-xs">
            {["All", "Approved", "Awaiting Approval", "HOD Approval", "Out", "Returned", "Rejected", "HOD Rejected", "Expired"].map((f) => (
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
          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">

            {filteredLogs.map((log: Pass, index: number) => (
              (() => {
                const label = getLogLabel(log);
                return (
                  <div
                    key={log._id || index}
                    onClick={() => handleLogClick(log._id)}
                    className="p-3 rounded-xl bg-gray-100 hover:scale-[1.02] transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">{log.place}</p>
                        <p className="text-xs text-gray-500">{log.passType === "LongLeave" ? "Long Leave" : "Short Pass"}</p>
                        <p className="mt-1 break-words text-xs text-gray-400">{getLogMeta(log)}</p>
                      </div>

                      <span className={`${getLogColor(label)} shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-xs text-white`}>
                        {label}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-500">
                      <p className="break-words">Out: {log.timeOut}</p>
                      <p className="break-words text-right">In: {log.timeIn}</p>
                    </div>
                  </div>
                );
              })()
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
