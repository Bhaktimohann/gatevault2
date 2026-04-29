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
    <div className={`glass-card relative rounded-3xl p-5 text-gray-800 ${className}`}>
      <div className={`absolute top-0 right-0 w-16 h-14 ${topBlobClass} rounded-bl-[40px]`} />
      {children}
    </div>
  );
}
