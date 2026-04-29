"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Home, Settings, LogOut, Edit } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    image: "/set2.png",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user) {
      setUser({
        name: session.user.name || "",
        email: session.user.email || "",
        phone: "",
        image: "/set2.png",
      });
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="mobile-shell-outer">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // 🔥 IMAGE CHANGE HANDLER
  const handleImageChange = (e: any) => {
    const file = e.target.files[0];

    if (file) {
      // ✅ SIZE LIMIT (150KB)
      if (file.size > 150 * 1024) {
        alert("Image too large! Max 150KB allowed.");
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      setUser({ ...user, image: imageUrl });
    }
  };

  return (
    <div className="mobile-shell-outer">

      {/* MOBILE FRAME */}
      <div className="mobile-shell">

        {/* 🔥 BACKGROUND */}
        <div className="absolute bottom-[-100px] right-[-50px] w-[500px] h-[350px] bg-gradient-to-r from-orange-400 to-orange-600 rounded-tl-[200px]" />

        {/* 🔥 MAIN CARD */}
        <div className="glass-card absolute top-[18%] left-1/2 w-[min(320px,calc(100%-32px))] -translate-x-1/2 rounded-3xl p-5 text-gray-800 animate-[slideUp_0.6s_ease, float_4s_ease-in-out_infinite]">

          {/* TOP BLOB */}
          <div className="absolute top-0 right-0 w-16 h-14 bg-orange-400 rounded-bl-[40px]" />

          {/* TITLE */}
          <h2 className="text-lg font-semibold text-gray-800 mt-2">
            Profile
          </h2>

          {/* 👤 PROFILE IMAGE */}
          <div className="flex justify-center mt-4">

            <div className="relative w-[80px] h-[80px]">
              <Image
                src={user.image || "/set2.png"}
                alt="profile"
                fill
                priority
                className="rounded-full object-cover border-2 border-orange-400 shadow-md"
              />

              {/* ✏️ EDIT BUTTON */}
              <label className="absolute bottom-0 right-0 bg-orange-500 p-1.5 rounded-full cursor-pointer shadow-md hover:scale-110 transition">
                <Edit size={12} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>

          </div>

          {/* 🔥 USER INFO */}
          <div className="text-center mt-3">
  <p className="font-semibold text-gray-800">{user.name}</p>
  <p className="text-xs text-gray-500">{user.email}</p>

  {/* 📱 PHONE NUMBER */}
  <p className="text-xs text-gray-500 mt-1">{user.phone}</p>
</div>

          

          {/* 🔥 VIEW ACTIVITY */}
          <div
            onClick={() => router.push("/log")}
            className="mt-4 bg-gradient-to-r from-orange-400 to-orange-600 text-white py-3 rounded-xl text-center font-medium cursor-pointer shadow-md hover:scale-105 active:scale-95 transition"
          >
            View Activity
          </div>

          {/* 🔥 LOGOUT */}
          <div
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-gray-100 rounded-xl mt-4 py-4 flex flex-col items-center cursor-pointer"
          >
            <LogOut size={18} className="text-red-500" />
            <p className="text-sm mt-1 text-red-500 font-medium">
              Log out
            </p>
          </div>

        </div>

        {/* 🔥 NAVBAR */}
        <div className="bottom-nav-shell absolute bottom-4 left-1/2 flex w-[min(320px,calc(100%-32px))] -translate-x-1/2 justify-around rounded-2xl py-3">

          {/* HOME */}
          <div
            onClick={() => router.push("/dashboard")}
            className="flex flex-col items-center text-gray-400 hover:text-orange-500 cursor-pointer"
          >
            <Home size={22} className="mb-1" />
            <p className="text-[10px]">Home</p>
          </div>

          {/* PROFILE ACTIVE */}
          <div className="flex flex-col items-center text-orange-500 relative">
            <div className="absolute -bottom-1 w-6 h-1 bg-orange-500 rounded-full"></div>
            👤
            <p className="text-[10px] font-medium">Profile</p>
          </div>

          {/* SETTINGS */}
          <div
            onClick={() => router.push("/settings")}
            className="flex flex-col items-center text-gray-400 hover:text-orange-500 cursor-pointer"
          >
            <Settings size={22} className="mb-1" />
            <p className="text-[10px]">Settings</p>
          </div>

        </div>

      </div>
    </div>
  );
}
