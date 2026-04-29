"use client";

import { useRouter } from "next/navigation";
import { Bell, ArrowLeft } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { PageSkeleton } from "@/components/LoadingSkeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function NotificationsPage() {
  const router = useRouter();
  const { isReady, status } = useAuthGuard();

  const handleBack = () => router.back();

  if (!isReady || status === "loading") {
    return <PageSkeleton />;
  }

  return (
    <MobileLayout>
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[320px]">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-xl animate-[slideUp_0.5s_ease]">
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

          <div className="flex flex-col items-center justify-center mt-10 text-gray-400">
            <Bell size={40} />
            <p className="mt-3 text-sm">No notifications yet</p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}