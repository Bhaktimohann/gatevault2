"use client";

import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function PassPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passId = searchParams.get("id");
  const { data: session, status } = useSession();

  const [pass, setPass] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const data = {
    date: "Apr 8",
    from: "12:20",
    to: "02:20",
    qr: "gatepass-123",
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && passId) {
      async function fetchPass() {
        try {
          const res = await fetch("/api/passes");
          if (res.ok) {
            const data = await res.json();
            const foundPass = data.passes?.find((p: any) => p._id === passId);
            if (foundPass) {
              setPass(foundPass);
            }
          }
        } catch (error) {
          console.error("Failed to fetch pass:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchPass();
    } else {
      setLoading(false);
    }
  }, [status, passId, router]);

  if (status === "loading" || loading) {
    return (
      <div className="mobile-shell-outer">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const passData = pass || { place: data.date, timeOut: data.from, timeIn: data.to };

  const [timeLeft, setTimeLeft] = useState(600);
  const [expiredLocal, setExpiredLocal] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setExpiredLocal(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const actualStatus = pass?.status || "Active";
  const isInvalid = expiredLocal || actualStatus === "Expired" || actualStatus === "Returned";

  return (
    <div className="mobile-shell-outer">

      {/* MOBILE FRAME */}
      <div className="mobile-shell">

        {/* 🔥 DARK HEADER */}
        <div className="bg-gradient-to-r from-[#0f0f0f] via-[#1a1a1a] to-[#000000] h-[260px] px-6 pt-10 text-white rounded-b-[40px] relative">
          <h1 className="text-2xl font-semibold">Gate-Pass</h1>
          <div className="absolute top-0 right-0 w-24 h-20 bg-orange-500 rounded-bl-[60px]" />
        </div>

        {/* 🔥 ORANGE BACKGROUND */}
        <div className="absolute bottom-0 w-full h-[40%] bg-gradient-to-r from-orange-400 to-orange-600 rounded-t-[60px]" />
        <div className="absolute bottom-0 left-0 w-24 h-20 bg-orange-500 rounded-tr-[60px]" />

        {/* 🔥 FLOATING CARD (Animation removed, card is now static) */}
        <div className="glass-card absolute top-[140px] left-1/2 w-[min(310px,calc(100%-40px))] -translate-x-1/2 rounded-3xl p-5 text-gray-800">

          {/* STATUS */}
          <div className="mb-2">
            <span
              className={`text-[10px] px-3 py-1 rounded-full text-white ${isInvalid ? "bg-red-500" : actualStatus === "Out" ? "bg-purple-500" : actualStatus === "Pending" ? "bg-orange-500" : "bg-green-500"
                }`}
            >
              {isInvalid ? (actualStatus === "Returned" ? "Returned" : "Expired") : actualStatus}
            </span>
          </div>

          {/* TOP ROW */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Image
                src="/set2.png"
                alt="Kaziranga University"
                width={36}
                height={36}
              />
              <div className="text-xs font-semibold text-gray-700 leading-tight">
                Kaziranga <br /> University
              </div>
            </div>

            <p className="text-lg font-bold text-gray-700">
              {pass ? new Date(pass.createdAt).toLocaleDateString() : data.date}
            </p>
          </div>

          {/* TIME + RUNNER */}
          <div className="flex justify-between items-center mb-4">

            <div>
              <p className="text-xs text-gray-400">Valid from</p>
              <p className="text-lg font-bold">{passData.timeOut}</p>
            </div>

            {/* Emoji is kept here but movement and extra classes are removed */}
            <div className="flex items-center justify-center w-16">
              <span className="text-xl inline-block transform scale-x-[-1]">🏃🏽‍♂️</span>
            </div>

            <div>
              <p className="text-xs text-gray-400">Valid to</p>
              <p className="text-lg font-bold">{passData.timeIn}</p>
            </div>

          </div>

          {/* 🔥 QR (DISAPPEARS AFTER RETURNED OR EXPIRED) */}
          <div className="flex justify-center mb-3 h-[170px] items-center">
            {!isInvalid && (
              <div className="p-2 bg-white border rounded-xl">
                <QRCodeSVG value={pass ? `gatepass-${pass._id}` : data.qr} size={150} />
              </div>
            )}
          </div>

          {/* ⏳ COUNTDOWN */}
          <p className="text-sm text-center font-semibold mb-3">
            {isInvalid
              ? (actualStatus === "Returned" ? "Pass Completed" : "Pass Expired")
              : `Expires in ${minutes}:${seconds
                .toString()
                .padStart(2, "0")}`}
          </p>

          <p className="text-[10px] text-gray-400 text-center mb-4">
            NB: This QR is only for one-time use
          </p>

          {/* 🔥 CANCEL BUTTON */}
          <button
            onClick={() => router.replace("/dashboard")}
            className="w-full bg-gradient-to-r from-orange-400 to-orange-600 text-white py-3 rounded-xl font-medium shadow-md hover:scale-105 active:scale-95 transition"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
