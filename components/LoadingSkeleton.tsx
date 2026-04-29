"use client";

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#f4f1ea] flex items-center justify-center">
      <div className="w-[390px] h-[844px] bg-[#f4f1ea] relative overflow-hidden rounded-[30px] shadow-2xl">
        <div className="absolute bottom-[-100px] right-[-50px] w-[500px] h-[350px] bg-gradient-to-r from-orange-400 to-orange-600 rounded-tl-[200px]" />
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[320px] bg-white/80 backdrop-blur-md rounded-3xl p-5">
          <LoadingSkeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            <LoadingSkeleton className="h-20 w-full rounded-xl" />
            <LoadingSkeleton className="h-16 w-full rounded-xl" />
            <LoadingSkeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}