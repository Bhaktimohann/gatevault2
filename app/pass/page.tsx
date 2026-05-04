"use client";

import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type GatePass = {
  _id: string;
  place: string;
  timeOut: string;
  timeIn: string;
  createdAt: string;
  passType?: "Short" | "LongLeave";
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  hodApprovalStatus?: "NotRequired" | "Pending" | "Approved" | "Rejected";
  wardenApprovalStatus?: "NotRequired" | "Pending" | "Approved" | "Rejected";
  status?: "Active" | "Out" | "Returned" | "Expired" | "Pending";
};

function PassLoading() {
  return (
    <div className="mobile-shell-outer">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
}

function PassContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passId = searchParams.get("id");
  const { status } = useSession();

  const [pass, setPass] = useState<GatePass | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expiredLocal, setExpiredLocal] = useState(false);
  const [qrData, setQrData] = useState("");
  const [qrExpiresAt, setQrExpiresAt] = useState("");

  const data = {
    date: "Apr 8",
    from: "12:20",
    to: "02:20",
    qr: "gatepass-123",
  };

  const fetchPass = useCallback(async () => {
    if (!passId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/passes?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const foundPass = (data.passes as GatePass[] | undefined)?.find((p) => p._id === passId);
        if (foundPass) {
          setPass(foundPass);
        }
      }
    } catch (error) {
      console.error("Failed to fetch pass:", error);
    } finally {
      setLoading(false);
    }
  }, [passId]);

  const fetchQrToken = useCallback(async () => {
    if (!passId) {
      return;
    }

    try {
      const res = await fetch("/api/passes/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ passId }),
      });
      const data = await res.json();

      if (res.ok) {
        setQrData(data.qrData || "");
        setQrExpiresAt(data.expiresAt || "");
        setExpiredLocal(false);
      } else {
        setQrData("");
        setQrExpiresAt("");
      }
    } catch (error) {
      console.error("Failed to fetch QR token:", error);
      setQrData("");
      setQrExpiresAt("");
    }
  }, [passId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchPass();
    }
  }, [status, router, fetchPass]);

  const approvalStatus = pass?.approvalStatus || "Approved";
  const hodApprovalStatus = pass?.hodApprovalStatus || "NotRequired";
  const wardenApprovalStatus = pass?.wardenApprovalStatus || (pass?.passType === "LongLeave" ? approvalStatus : "NotRequired");
  const isWaitingForApproval =
    approvalStatus === "Pending" ||
    (pass?.passType === "LongLeave" && (hodApprovalStatus === "Pending" || wardenApprovalStatus === "Pending"));

  const isQrApproved =
    !!pass &&
    approvalStatus === "Approved" &&
    (pass?.passType !== "LongLeave" || (hodApprovalStatus === "Approved" && wardenApprovalStatus === "Approved"));
  const canStillBeScanned =
    !!pass &&
    isQrApproved &&
    pass.status !== "Returned" &&
    pass.status !== "Expired";

  useEffect(() => {
    if (status !== "authenticated" || !passId || (!isWaitingForApproval && !canStillBeScanned)) {
      return;
    }

    const refresh = () => {
      fetchPass();
    };

    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchPass();
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    const poller = window.setInterval(fetchPass, 3000);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
      window.clearInterval(poller);
    };
  }, [status, passId, isWaitingForApproval, canStillBeScanned, fetchPass]);

  useEffect(() => {
    if (!canStillBeScanned) {
      setQrData("");
      setQrExpiresAt("");
      return;
    }

    fetchQrToken();

    const refreshToken = window.setInterval(fetchQrToken, 45000);

    return () => window.clearInterval(refreshToken);
  }, [canStillBeScanned, fetchQrToken]);

  useEffect(() => {
    if (!qrExpiresAt) {
      setTimeLeft(0);
      return;
    }

    const updateTimeLeft = () => {
      const secondsLeft = Math.max(0, Math.ceil((new Date(qrExpiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(secondsLeft);
      setExpiredLocal(secondsLeft <= 0);
    };

    updateTimeLeft();
    const timer = window.setInterval(updateTimeLeft, 1000);

    return () => window.clearInterval(timer);
  }, [qrExpiresAt]);

  if (status === "loading" || loading) {
    return <PassLoading />;
  }

  const passData = pass || { place: data.date, timeOut: data.from, timeIn: data.to };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const actualStatus = pass?.status || "Active";
  const needsHodApproval = pass?.passType === "LongLeave" && hodApprovalStatus === "Pending";
  const isHodRejected = pass?.passType === "LongLeave" && hodApprovalStatus === "Rejected";
  const needsWardenApproval = pass?.passType === "LongLeave" && hodApprovalStatus === "Approved" && wardenApprovalStatus === "Pending";
  const isWardenRejected = pass?.passType === "LongLeave" && wardenApprovalStatus === "Rejected";
  const isAwaitingApproval = approvalStatus === "Pending";
  const isRejected = approvalStatus === "Rejected";
  const pendingApprovalLabel = pass?.passType === "LongLeave" ? "warden" : "admin";
  const isInvalid = expiredLocal || actualStatus === "Expired" || actualStatus === "Returned";
  const canShowQr = !!qrData && !isInvalid && approvalStatus === "Approved" && !needsHodApproval && !isHodRejected && !needsWardenApproval && !isWardenRejected;

  return (
    <div className="mobile-shell-outer">

      {/* MOBILE FRAME */}
      <div className="mobile-shell">

        {/* 🔥 DARK HEADER */}
        <div className="relative h-[220px] rounded-b-[40px] bg-gradient-to-r from-[#0f0f0f] via-[#1a1a1a] to-[#000000] px-6 pt-9 text-white sm:h-[260px] sm:pt-10">
          <h1 className="text-2xl font-semibold">Gate-Pass</h1>
          <div className="absolute top-0 right-0 w-24 h-20 bg-orange-500 rounded-bl-[60px]" />
        </div>

        {/* 🔥 ORANGE BACKGROUND */}
        <div className="absolute bottom-0 w-full h-[40%] bg-gradient-to-r from-orange-400 to-orange-600 rounded-t-[60px]" />
        <div className="absolute bottom-0 left-0 w-24 h-20 bg-orange-500 rounded-tr-[60px]" />

        {/* 🔥 FLOATING CARD (Animation removed, card is now static) */}
        <div className="glass-card absolute left-1/2 top-[100px] max-h-[calc(100%-124px)] w-[min(310px,calc(100%-40px))] -translate-x-1/2 overflow-y-auto rounded-3xl p-5 text-gray-800 sm:top-[140px] sm:w-[min(560px,calc(100%-80px))]">

          {/* STATUS */}
          <div className="mb-2">
            <span
              className={`text-[10px] px-3 py-1 rounded-full text-white ${isRejected || isHodRejected || isWardenRejected || isInvalid ? "bg-red-500" : needsHodApproval || needsWardenApproval || isAwaitingApproval || actualStatus === "Pending" ? "bg-orange-500" : actualStatus === "Out" ? "bg-purple-500" : "bg-green-500"
                }`}
            >
              {isHodRejected
                ? "HOD Rejected"
                : isWardenRejected
                  ? "Warden Rejected"
                : needsHodApproval
                  ? "HOD Approval"
                  : needsWardenApproval
                    ? "Warden Approval"
                  : isRejected
                ? "Rejected"
                : isAwaitingApproval
                  ? pass?.passType === "LongLeave"
                    ? "Warden Approval"
                    : "Admin Approval"
                  : isInvalid
                    ? (actualStatus === "Returned" ? "Returned" : "Expired")
                    : actualStatus}
            </span>
          </div>

          {/* TOP ROW */}
          <div className="mb-4 flex items-start justify-between gap-3">
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
          <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">

            <div className="min-w-0">
              <p className="text-xs text-gray-400">Valid from</p>
              <p className="break-words text-lg font-bold">{passData.timeOut}</p>
            </div>

            {/* Emoji is kept here but movement and extra classes are removed */}
            <div className="flex items-center justify-center w-16">
              <span className="text-xl inline-block transform scale-x-[-1]">🏃🏽‍♂️</span>
            </div>

            <div className="min-w-0 text-right">
              <p className="text-xs text-gray-400">Valid to</p>
              <p className="break-words text-lg font-bold">{passData.timeIn}</p>
            </div>

          </div>

          {/* 🔥 QR (DISAPPEARS AFTER RETURNED OR EXPIRED) */}
          <div className="mb-3 flex h-[150px] items-center justify-center sm:h-[170px]">
            {canShowQr ? (
              <div className="p-2 bg-white border rounded-xl">
                <QRCodeSVG value={qrData} size={132} />
              </div>
            ) : (
              <div className="flex h-[132px] w-[132px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-xs font-medium text-gray-500 sm:h-[150px] sm:w-[150px]">
                {isHodRejected
                    ? "This long leave was rejected"
                  : isWardenRejected
                    ? "This long leave was rejected by warden"
                  : isRejected
                    ? "This pass was rejected"
                    : needsHodApproval
                      ? "QR unlocks after HOD approval"
                      : needsWardenApproval
                        ? "QR unlocks after warden approval"
                  : isAwaitingApproval
                    ? `QR unlocks after ${pendingApprovalLabel} approval`
                    : "QR no longer available"}
              </div>
            )}
          </div>

          {/* ⏳ COUNTDOWN */}
          <p className="text-sm text-center font-semibold mb-3">
            {isInvalid
              ? (actualStatus === "Returned" ? "Pass Completed" : "Pass Expired")
              : isHodRejected
                ? "Long Leave Rejected"
                : isWardenRejected
                  ? "Long Leave Rejected"
                : needsHodApproval
                  ? "Waiting for HOD approval"
                  : needsWardenApproval
                    ? "Waiting for warden approval"
              : isRejected
                ? "Pass Rejected"
                : isAwaitingApproval
                  ? `Waiting for ${pendingApprovalLabel} approval`
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

export default function PassPage() {
  return (
    <Suspense fallback={<PassLoading />}>
      <PassContent />
    </Suspense>
  );
}
