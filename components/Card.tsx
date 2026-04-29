"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: "orange" | "blue";
}

export function Card({ children, className = "", style = "orange" }: CardProps) {
  const topBlobClass = style === "orange" ? "bg-orange-400" : "bg-blue-500";

  return (
    <div className={`relative bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.1)] ${className}`}>
      <div className={`absolute top-0 right-0 w-16 h-14 ${topBlobClass} rounded-bl-[40px]`} />
      {children}
    </div>
  );
}