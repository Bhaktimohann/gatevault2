"use client";

import { useRouter } from "next/navigation";
import {
  Info,
  Settings,
  LogOut,
  Home,
  User,
  Bell,
  AlertCircle,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePasses } from "@/hooks/usePasses";
import { Pass } from "@/types";
import { PageSkeleton } from "@/components/LoadingSkeleton";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { passes, loading, error, refetch } = usePasses();

  if (status === "loading" || loading) {
    return <PageSkeleton />;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const latestPass: Pass | undefined = passes[0];

  const handleLogout = () => signOut({ callbackUrl: "/login" });

  return (
    <div className="mobile-shell-outer dashboard-shell-outer">

      {/* MOBILE FRAME */}
      <div className="mobile-shell dashboard-shell">

        {/* 🔥 THEA BLUE WAVE BACKGROUND */}
        <div className="absolute bottom-0 left-0 w-full h-[220px] overflow-hidden">

          {/* MAIN WAVE */}
          <svg
            viewBox="0 0 500 150"
            preserveAspectRatio="none"
            className="absolute bottom-[-1px] left-0 w-full h-full animate-wave"
          >
            <path
              d="M0,80 C150,150 350,0 500,80 L500,150 L0,150 Z"
              className="fill-blue-500"
            />
          </svg>

          {/* LIGHT WAVE (SECOND LAYER) */}
          <svg
            viewBox="0 0 500 150"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 w-full h-full opacity-40 animate-waveSlow"
          >
            <path
              d="M0,100 C200,0 300,150 500,100 L500,150 L0,150 Z"
              className="fill-blue-300"
            />
          </svg>

        </div>

        {/* 🔥 MAIN CARD */}
        <div className="glass-card absolute top-[18%] left-1/2 w-[min(320px,calc(100%-32px))] -translate-x-1/2 rounded-3xl p-5 text-gray-800">

          {/* TOP BLOB */}
          <div className="absolute top-0 right-0 w-16 h-14 bg-blue-500 rounded-bl-[40px]" />

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg mb-3">
              <AlertCircle size={16} />
              <p className="text-xs">{error}</p>
              <button onClick={refetch} className="ml-auto text-xs underline">Retry</button>
            </div>
          )}

          {latestPass ? (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mt-2">
                {latestPass.place}
              </h2>

              <span className={`inline-block text-white text-xs px-3 py-1 rounded-full mt-2 ${latestPass.status === 'Active' ? 'bg-green-500' : latestPass.status === 'Pending' ? 'bg-orange-500' : latestPass.status === 'Out' ? 'bg-purple-500' : latestPass.status === 'Returned' ? 'bg-teal-500' : 'bg-red-500'}`}>
                {latestPass.status}
              </span>

              {/* INNER CARD */}
              <div className="bg-gray-100 rounded-2xl p-4 mt-4">
                <div className="flex justify-between mb-3 gap-3">
                  <div>
                    <p className="text-blue-500 text-xs">Time Out</p>
                    <p className="text-sm font-semibold">{latestPass.timeOut}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    {new Date(latestPass.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-blue-500 text-xs">Time In</p>
                    <p className="text-sm font-semibold">{latestPass.timeIn}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    {new Date(latestPass.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 text-center py-6 text-gray-500 bg-gray-100 rounded-2xl">
              <p className="text-sm font-medium">No active passes</p>
            </div>
          )}

          {/* STATUS */}
          <div
            onClick={() => router.push("/student-status")}
            className="mt-4 bg-gray-100 rounded-xl p-3 text-center cursor-pointer hover:scale-105 transition"
          >
            <p className="text-sm font-medium">Student Status</p>
            <p className={`text-xs font-semibold mt-1 ${latestPass?.status === 'Out' ? 'text-purple-600' : 'text-green-600'}`}>
              {latestPass?.status === 'Out' ? 'Out of Campus' : 'In Campus'}
            </p>
          </div>

          {/* CREATE */}
          <div
            onClick={() => router.push("/create")}
            className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl text-center font-medium cursor-pointer shadow-md hover:scale-105 active:scale-95 transition"
          >
            + Create
          </div>

          {/* PROFILE + NOTIFICATIONS */}
          <div className="grid grid-cols-2 gap-3 mt-4">

            <div
              onClick={() => router.push("/profile")}
              className="bg-gray-100 rounded-xl py-4 flex flex-col items-center cursor-pointer hover:scale-105 transition"
            >
              <User size={18} />
              <p className="text-sm mt-1">Profile</p>
            </div>

            <div
              onClick={() => router.push("/notifications")}
              className="bg-gray-100 rounded-xl py-4 flex flex-col items-center cursor-pointer hover:scale-105 transition relative"
            >
              <Bell size={18} />
              <p className="text-sm mt-1">Notifications</p>

              <span className="absolute top-2 right-4 bg-red-500 text-white text-[10px] px-1 rounded-full">
                2
              </span>
            </div>

          </div>

          {/* LOGOUT */}
          <div
            onClick={handleLogout}
            className="bg-gray-100 rounded-xl mt-4 py-4 flex flex-col items-center cursor-pointer hover:scale-105 transition"
          >
            <LogOut size={18} className="text-red-500" />
            <p className="text-sm mt-1 text-red-500 font-medium">
              Log out
            </p>
          </div>

        </div>

        {/* 🔥 NAVBAR */}
        <div className="bottom-nav-shell absolute bottom-4 left-1/2 flex w-[min(320px,calc(100%-32px))] -translate-x-1/2 justify-around rounded-2xl py-3">

          <div className="flex flex-col items-center text-blue-500 relative">
            <div className="absolute -bottom-1 w-6 h-1 bg-blue-500 rounded-full"></div>
            <Home size={22} />
            <p className="text-[10px] font-medium">Home</p>
          </div>

          <div
            onClick={() => router.push("/log")}
            className="flex flex-col items-center text-gray-400 hover:text-blue-500 cursor-pointer"
          >
            <Info size={22} />
            <p className="text-[10px]">Log</p>
          </div>

          <div
            onClick={() => router.push("/settings")}
            className="flex flex-col items-center text-gray-400 hover:text-blue-500 cursor-pointer"
          >
            <Settings size={22} />
            <p className="text-[10px]">Settings</p>
          </div>

        </div>

      </div>
    </div>
  );
}
