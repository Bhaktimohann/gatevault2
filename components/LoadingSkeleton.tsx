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
    <div className="mobile-shell-outer">
      <div className="mobile-shell">
        <div className="absolute bottom-[-100px] right-[-50px] w-[500px] h-[350px] bg-gradient-to-r from-orange-400 to-orange-600 rounded-tl-[200px]" />
        <div className="glass-card absolute top-[15%] left-1/2 w-[min(320px,calc(100%-32px))] -translate-x-1/2 rounded-3xl p-5">
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
