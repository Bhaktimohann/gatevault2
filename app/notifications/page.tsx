"use client";

import { useRouter } from "next/navigation";
import { Bell, ArrowLeft } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { NotificationItem, useNotifications } from "@/hooks/useNotifications";

export default function NotificationsPage() {
  const router = useRouter();
  const { isReady, status } = useAuthGuard();
  const { notifications, loading, markAllAsRead } = useNotifications();

  const handleBack = () => router.back();

  if (!isReady || status === "loading" || loading) {
    return <PageSkeleton />;
  }

  const handleOpenPass = async (passId?: string) => {
    await markAllAsRead();
    if (passId) {
      router.push(`/pass?id=${passId}`);
      return;
    }
    router.back();
  };

  return (
    <MobileLayout>
      <div className="absolute left-1/2 top-8 max-h-[calc(100%-64px)] w-[min(330px,calc(100%-32px))] -translate-x-1/2 overflow-y-auto sm:w-[min(640px,calc(100%-64px))]">
        <div className="rounded-3xl bg-white/80 p-5 shadow-xl backdrop-blur-md animate-[slideUp_0.5s_ease]">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleBack}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Go back"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>

          <div className="grid gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {notifications.map((notification: NotificationItem) => (
              <button
                key={notification._id}
                type="button"
                onClick={() => handleOpenPass(notification.pass)}
                className={`w-full rounded-2xl border p-4 text-left transition ${notification.read ? "border-gray-200 bg-gray-50" : "border-orange-200 bg-orange-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-gray-800">{notification.title}</p>
                    <p className="mt-1 break-words text-xs text-gray-500">{notification.message}</p>
                  </div>
                  {!notification.read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" />}
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </button>
            ))}

            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center mt-10 text-gray-400">
                <Bell size={40} />
                <p className="mt-3 text-sm">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
