"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, Info, Settings } from "lucide-react";

interface BottomNavProps {
  activeTab?: "home" | "log" | "settings";
  color?: "orange" | "blue";
}

export function BottomNav({ activeTab = "home", color = "orange" }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const activeColor = color === "blue" ? "text-blue-500" : "text-orange-500";
  const inactiveColor = color === "blue" 
    ? "text-gray-400 hover:text-blue-500" 
    : "text-gray-400 hover:text-orange-500";
  const indicatorColor = color === "blue" ? "bg-blue-500" : "bg-orange-500";

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home", key: "home" as const },
    { href: "/log", icon: Info, label: "Log", key: "log" as const },
    { href: "/settings", icon: Settings, label: "Settings", key: "settings" as const },
  ];

  const isActive = (key: "home" | "log" | "settings") => pathname === navItems.find(n => n.key === key)?.href;

  return (
    <div className="bottom-nav-shell absolute bottom-4 left-1/2 w-[min(320px,calc(100%-32px))] -translate-x-1/2 rounded-2xl flex justify-around py-3">
      {navItems.map((item) => {
        const active = isActive(item.key);
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center cursor-pointer transition-colors relative ${
              active ? activeColor : inactiveColor
            }`}
          >
            <item.icon size={22} />
            <p className={`text-[10px] ${active ? "font-medium" : ""}`}>{item.label}</p>
            {active && <div className={`absolute -bottom-1 w-6 h-1 ${indicatorColor} rounded-full`} />}
          </button>
        );
      })}
    </div>
  );
}
