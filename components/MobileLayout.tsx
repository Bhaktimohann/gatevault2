"use client";

import { ReactNode } from "react";

interface MobileLayoutProps {
  children: ReactNode;
  bgGradient?: "orange" | "blue";
}

export function MobileLayout({ children, bgGradient = "orange" }: MobileLayoutProps) {
  const gradientClass = bgGradient === "orange" 
    ? "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600"
    : "bg-gradient-to-br from-blue-400 to-blue-600";

  const positionClass = bgGradient === "orange"
    ? "bottom-[-100px] right-[-50px] w-[500px] h-[350px]"
    : "bottom-[-120px] right-[-80px] w-[520px] h-[380px]";

  return (
    <div className="mobile-shell-outer">
      <div className="mobile-shell">
        <div className={`absolute ${positionClass} ${gradientClass} rounded-tl-[200px]`} />
        {children}
      </div>
    </div>
  );
}
