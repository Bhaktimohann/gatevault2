"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  AlertCircle,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

type ScanLog = {
  id: string;
  student: string;
  email: string;
  place: string;
  direction: "Out" | "In";
  scannedAt: string;
};

type ScanStats = {
  totalScans: number;
  scannedOut: number;
  scannedIn: number;
};

export default function SecurityDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [scanStats, setScanStats] = useState<ScanStats>({ totalScans: 0, scannedOut: 0, scannedIn: 0 });
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState("");

  const canView = role === "security" || role === "admin";

  const openScanner = () => {
    window.location.assign("/guard");
  };

  const fetchScanStats = async () => {
    setLoadingStats(true);
    setError("");

    try {
      const res = await fetch("/api/scan", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load scan dashboard");
      }

      setScanStats(data.stats || { totalScans: 0, scannedOut: 0, scannedIn: 0 });
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setScanStats({ totalScans: 0, scannedOut: 0, scannedIn: 0 });
      setLogs([]);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !canView) {
      setLoadingStats(false);
      return;
    }

    fetchScanStats();
  }, [status, canView]);

  if (status === "loading" || loadingStats) {
    return (
      <div className="min-h-screen bg-[#e8eef1] p-4 sm:p-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[220px_1fr]">
          <div className="h-[720px] animate-pulse rounded-[28px] bg-slate-900/90" />
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-[28px] bg-white/70" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-32 animate-pulse rounded-[28px] bg-white/70" />
              <div className="h-32 animate-pulse rounded-[28px] bg-white/70" />
              <div className="h-32 animate-pulse rounded-[28px] bg-white/70" />
            </div>
            <div className="h-96 animate-pulse rounded-[28px] bg-white/70" />
          </div>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8edda,#e5eef2_46%,#d7c0ae)] px-4 py-6 text-slate-900">
        <main className="mx-auto max-w-3xl rounded-[28px] border border-white/70 bg-white/58 p-8 text-center shadow-xl backdrop-blur-2xl">
          <ShieldCheck className="mx-auto text-red-500" size={36} />
          <h1 className="mt-4 text-xl font-semibold">Security access required</h1>
          <p className="mt-2 text-sm text-slate-500">Please log in with a security account.</p>
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="mt-5 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Go to login
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8edda,#e5eef2_46%,#d7c0ae)] px-3 py-4 text-slate-900 sm:px-6 sm:py-8">
      <main className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-[28px] bg-[#111111] p-5 text-white shadow-2xl lg:min-h-[760px]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-300 text-slate-950">
              <GraduationCap size={20} />
            </span>
            <div>
              <p className="text-lg font-semibold">GateVault</p>
              <p className="text-xs text-white/46">Security Console</p>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            <div className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-slate-950">
              <LayoutDashboard size={17} />
              Dashboard
            </div>
            <button type="button" onClick={() => router.push("/security/profile")} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/66 transition hover:bg-white/10 hover:text-white">
              <User size={17} />
              Profile
            </button>
          </nav>

          <div className="mt-10 rounded-3xl bg-white/8 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={16} />
              Scan Desk
            </p>
            <p className="mt-2 text-xs leading-5 text-white/56">Open the scanner to mark student exit and return from approved QR passes.</p>
            <button type="button" onClick={fetchScanStats} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-950">
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="mt-8 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/66 hover:bg-white/10 hover:text-white">
            <LogOut size={17} />
            Log out
          </button>
        </aside>

        <section className="min-w-0 space-y-4">
          <header className="rounded-[28px] border border-white/70 bg-white/58 p-5 text-slate-900 shadow-xl backdrop-blur-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gate entry operations</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Security dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Scan approved passes, monitor exits and returns, and review recent gate activity.
                </p>
              </div>

              <button type="button" onClick={openScanner} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white">
                <QrCode size={16} />
                Open Scanner
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                { label: "Total QR Scans", value: scanStats.totalScans, icon: ScanLine, tone: "bg-sky-300" },
                { label: "Students Out", value: scanStats.scannedOut, icon: QrCode, tone: "bg-amber-300" },
                { label: "Returned", value: scanStats.scannedIn, icon: ShieldCheck, tone: "bg-emerald-300" },
              ].map((card) => (
                <article key={card.label} className="rounded-3xl border border-white/70 bg-[#f8f2e8]/84 p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <span className={`grid h-10 w-10 place-items-center rounded-2xl text-slate-950 ${card.tone}`}>
                      <card.icon size={18} />
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-semibold">{card.value}</p>
                </article>
              ))}
            </div>
          </header>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <section className="grid gap-4 xl:grid-cols-[0.8fr_1fr]">
            <article className="rounded-[28px] border border-white/70 bg-white/58 p-5 text-slate-900 shadow-xl backdrop-blur-2xl">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
              <p className="mt-1 text-sm text-slate-500">Open the scanner or refresh activity before shift handoff.</p>

              <div className="mt-5 grid gap-3">
                <button type="button" onClick={openScanner} className="rounded-3xl border border-white/70 bg-[#f8f2e8]/84 p-4 text-left transition hover:bg-white">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300 text-slate-950">
                      <QrCode size={22} />
                    </span>
                    <div>
                      <h3 className="font-semibold">Open QR Scanner</h3>
                      <p className="mt-1 text-sm text-slate-500">Scan student QR passes for exit and return.</p>
                    </div>
                  </div>
                </button>

                <button type="button" onClick={fetchScanStats} className="rounded-3xl border border-white/70 bg-[#f8f2e8]/84 p-4 text-left transition hover:bg-white">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300 text-slate-950">
                      <RefreshCw size={22} />
                    </span>
                    <div>
                      <h3 className="font-semibold">Refresh Logs</h3>
                      <p className="mt-1 text-sm text-slate-500">Pull the latest scan totals and recent activity.</p>
                    </div>
                  </div>
                </button>
              </div>
            </article>

            <article className="rounded-[28px] border border-white/70 bg-white/58 p-5 text-slate-900 shadow-xl backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Recent Scan Logs</h2>
                  <p className="text-sm text-slate-500">{logs.length} latest scan events</p>
                </div>
                <History size={20} className="text-slate-500" />
              </div>

              <div className="mt-4 space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-3xl border border-white/70 bg-[#f8f2e8]/84 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{log.student}</p>
                        <p className="text-xs text-slate-500">{log.email}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${log.direction === "Out" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {log.direction}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{log.place}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(log.scannedAt).toLocaleString()}</p>
                  </div>
                ))}

                {logs.length === 0 && <div className="rounded-3xl border border-white/70 bg-[#f8f2e8]/84 p-8 text-center text-sm text-slate-500">No scan logs yet.</div>}
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  );
}
