"use client";

import { useEffect } from "react";
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
import { useNotifications } from "@/hooks/useNotifications";
import { Pass } from "@/types";
import { PageSkeleton } from "@/components/LoadingSkeleton";

function isCampusOut(pass: Pass) {
  return pass.status === "Out" || Boolean(pass.scannedOutAt && !pass.scannedInAt);
}

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { passes, loading, error, refetch } = usePasses(isAuthenticated);
  const { unreadCount } = useNotifications(isAuthenticated);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (loading) {
    return <PageSkeleton />;
  }

  const latestPass: Pass | undefined = passes[0];
  const campusStatusPass: Pass | undefined = passes.find(isCampusOut) || latestPass;
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const isOutOfCampus = campusStatusPass ? isCampusOut(campusStatusPass) : false;
  const latestNeedsWardenApproval =
    latestPass?.passType === "LongLeave" &&
    latestPass.hodApprovalStatus === "Approved" &&
    latestPass.approvalStatus === "Pending";

  const handleLogout = () => signOut({ callbackUrl: "/login" });

  return (
    <div className="mobile-shell-outer dashboard-shell-outer">
      <div className="mobile-shell dashboard-shell student-dashboard-shell">
        <div className="pointer-events-none absolute bottom-0 left-0 h-[220px] w-full overflow-hidden sm:h-[260px]">
          <svg
            viewBox="0 0 500 150"
            preserveAspectRatio="none"
            className="absolute bottom-[-1px] left-0 h-full w-full animate-wave"
          >
            <path
              d="M0,80 C150,150 350,0 500,80 L500,150 L0,150 Z"
              className="fill-orange-600"
            />
          </svg>

          <svg
            viewBox="0 0 500 150"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 h-full w-full animate-waveSlow opacity-40"
          >
            <path
              d="M0,100 C200,0 300,150 500,100 L500,150 L0,150 Z"
              className="fill-orange-300"
            />
          </svg>
        </div>

        <main className="student-dashboard-content">
          <section className="glass-card relative mx-auto w-full max-w-[420px] rounded-3xl p-5 text-gray-800 animate-[slideUp_0.6s_ease] sm:p-6 md:max-w-[460px]">
            <div className="absolute right-0 top-0 h-14 w-16 rounded-bl-[40px] bg-orange-400" />

            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-600">
                <AlertCircle size={16} />
                <p className="text-xs">{error}</p>
                <button onClick={refetch} className="ml-auto text-xs underline">Retry</button>
              </div>
            )}

            {latestPass ? (
              <>
                <h2 className="mt-2 break-words pr-12 text-lg font-semibold text-gray-800">
                  {latestPass.place}
                </h2>

                <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs text-white ${latestPass.hodApprovalStatus === "Rejected" || latestPass.approvalStatus === "Rejected" ? "bg-red-500" : latestPass.hodApprovalStatus === "Pending" || latestPass.approvalStatus === "Pending" || latestPass.status === "Pending" ? "bg-orange-500" : latestPass.status === "Active" ? "bg-green-500" : latestPass.status === "Out" ? "bg-purple-500" : latestPass.status === "Returned" ? "bg-teal-500" : "bg-red-500"}`}>
                  {latestPass.hodApprovalStatus === "Pending"
                    ? "HOD Approval"
                    : latestPass.hodApprovalStatus === "Rejected"
                      ? "HOD Rejected"
                      : latestNeedsWardenApproval
                        ? "Warden Approval"
                      : latestPass.approvalStatus === "Pending"
                        ? "Admin Approval"
                        : latestPass.approvalStatus === "Rejected"
                          ? "Rejected"
                          : latestPass.status}
                </span>

                <div className="mt-4 rounded-2xl bg-gray-100 p-4">
                  <div className="mb-3 grid grid-cols-[1fr_auto] gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-orange-500">Time Out</p>
                      <p className="break-words text-sm font-semibold">{latestPass.timeOut}</p>
                    </div>
                    <p className="mt-4 text-xs text-gray-500">
                      {new Date(latestPass.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-orange-500">Time In</p>
                      <p className="break-words text-sm font-semibold">{latestPass.timeIn}</p>
                    </div>
                    <p className="mt-4 text-xs text-gray-500">
                      {new Date(latestPass.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/pass?id=${latestPass._id}`)}
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 py-3 text-sm font-medium text-white shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  {latestPass.approvalStatus === "Approved" ? "View QR" : "View Pass Status"}
                </button>
              </>
            ) : (
              <div className="mt-6 rounded-2xl bg-gray-100 py-6 text-center text-gray-500">
                <p className="text-sm font-medium">No active passes</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push("/student-status")}
              className="mt-4 w-full rounded-xl bg-gray-100 p-3 text-center transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <p className="text-sm font-medium">Student Status</p>
              <p className={`mt-1 text-xs font-semibold ${isOutOfCampus ? "text-purple-600" : "text-green-600"}`}>
                {isOutOfCampus ? "Out of Campus" : "In Campus"}
              </p>
            </button>

            <button
              type="button"
              onClick={() => router.push("/create")}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 py-3 text-center font-medium text-white shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
            >
              + Create
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="mt-3 w-full rounded-xl bg-gray-900 py-3 text-center font-medium text-white shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Admin Approvals
              </button>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="flex min-h-[76px] flex-col items-center justify-center rounded-xl bg-gray-100 py-4 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <User size={18} />
                <p className="mt-1 text-sm">Profile</p>
              </button>

              <button
                type="button"
                onClick={() => router.push("/notifications")}
                className="relative flex min-h-[76px] flex-col items-center justify-center rounded-xl bg-gray-100 py-4 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Bell size={18} />
                <p className="mt-1 text-sm">Notifications</p>

                {unreadCount > 0 && (
                  <span className="absolute right-4 top-2 rounded-full bg-red-500 px-1 text-[10px] text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex min-h-[76px] w-full flex-col items-center justify-center rounded-xl bg-gray-100 py-4 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogOut size={18} className="text-red-500" />
              <p className="mt-1 text-sm font-medium text-red-500">
                Log out
              </p>
            </button>
          </section>
        </main>

        <nav className="bottom-nav-shell absolute bottom-4 left-1/2 flex w-[min(420px,calc(100%-32px))] -translate-x-1/2 justify-around rounded-2xl py-3">
          <div className="relative flex flex-col items-center text-orange-500">
            <div className="absolute -bottom-1 h-1 w-6 rounded-full bg-orange-500" />
            <Home size={22} />
            <p className="text-[10px] font-medium">Home</p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/log")}
            className="flex flex-col items-center text-gray-400 transition-colors hover:text-orange-500"
          >
            <Info size={22} />
            <p className="text-[10px]">Log</p>
          </button>

          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex flex-col items-center text-gray-400 transition-colors hover:text-orange-500"
          >
            <Settings size={22} />
            <p className="text-[10px]">Settings</p>
          </button>
        </nav>
      </div>
    </div>
  );
}
