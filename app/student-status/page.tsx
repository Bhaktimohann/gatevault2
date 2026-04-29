"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/MobileLayout";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { usePasses } from "@/hooks/usePasses";

export default function StudentStatusPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { passes, loading } = usePasses();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return <PageSkeleton />;
  }

  const latestPass = passes?.[0];
  const isOut = latestPass?.status === "Out";

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <MobileLayout>
      <div className="absolute top-[14%] left-1/2 -translate-x-1/2 w-[330px]">
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-14 bg-orange-400 rounded-bl-[40px]" />

          <p className="text-center text-xs tracking-wide text-gray-500">STUDENT STATUS</p>

          <div className="flex flex-col items-center mt-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 border-4 border-orange-400 flex items-center justify-center text-lg shadow-md">
              {initials}
            </div>

            <p className="mt-3 font-semibold text-gray-800 text-sm">
              {session?.user?.name || "Student"}
            </p>

            <p className="text-xs text-gray-500">GateVault User</p>
          </div>

          <div className="flex justify-center mt-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold shadow-sm ${isOut ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
              <span className={`w-2 h-2 rounded-full animate-ping ${isOut ? 'bg-purple-500' : 'bg-green-500'}`}></span>
              {isOut ? 'OUT OF CAMPUS' : 'IN HOSTEL'}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 active:scale-95">
              <p className="text-[10px] text-gray-500">Since</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">--:--</p>
            </div>

            <div className="bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 active:scale-95">
              <p className="text-[10px] text-gray-500">Activity</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">--</p>
            </div>

            <div className="bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 active:scale-95">
              <p className="text-[10px] text-gray-500">Battery</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">--%</p>
            </div>
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-5">
            Live tracking • GateVault Verified
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}