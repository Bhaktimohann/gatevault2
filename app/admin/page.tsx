"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AdminPass = {
  _id: string;
  phone: string;
  place: string;
  purpose: string;
  timeOut: string;
  timeIn: string;
  person?: string;
  personPhone?: string;
  createdAt: string;
  updatedAt?: string;
  status?: "Active" | "Out" | "Returned" | "Expired" | "Pending";
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  approvedAt?: string;
  rejectedAt?: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    hostel?: string;
    room?: string;
  };
};

type QueueRow = AdminPass & {
  queueStatus: "Pending" | "Approved" | "Rejected";
  source: "Pending" | "Log";
};

type SortKey = "student" | "place" | "status" | "date";
type DashboardView = "dashboard" | "requests" | "calendar" | "reports";

function safeDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return safeDate(value).toLocaleDateString();
}

function getStudentName(pass: AdminPass) {
  return pass.user?.name || "Student";
}

function getApprovalStatus(pass: AdminPass): "Pending" | "Approved" | "Rejected" {
  return pass.approvalStatus || "Pending";
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [passes, setPasses] = useState<AdminPass[]>([]);
  const [logs, setLogs] = useState<AdminPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedRequest, setSelectedRequest] = useState<QueueRow | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>("dashboard");

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  const fetchPasses = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/passes");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load approval requests");
      }

      setPasses(data.passes || []);
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      if (!isAdmin) {
        setError("Admin access required");
        setLoading(false);
        return;
      }

      fetchPasses();
    }
  }, [status, isAdmin, router]);

  const decidePass = async (passId: string, action: "approve" | "reject") => {
    setUpdatingId(passId);
    setError("");

    try {
      const res = await fetch("/api/admin/passes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passId, action }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update pass");
      }

      await fetchPasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdatingId("");
    }
  };

  const rows = useMemo<QueueRow[]>(() => {
    const pendingRows = passes.map((pass) => ({ ...pass, queueStatus: "Pending" as const, source: "Pending" as const }));
    const logRows = logs.map((log) => ({ ...log, queueStatus: getApprovalStatus(log), source: "Log" as const }));
    return [...pendingRows, ...logRows];
  }, [passes, logs]);

  const filteredRows = useMemo(() => {
    const loweredSearch = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const haystack = [
        getStudentName(row),
        row.user?.email,
        row.phone,
        row.place,
        row.purpose,
        row.user?.hostel,
        row.user?.room,
        row.status,
        row.queueStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (!loweredSearch || haystack.includes(loweredSearch)) && (statusFilter === "All" || row.queueStatus === statusFilter || row.status === statusFilter);
    });

    return filtered.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const values = {
        student: getStudentName(a).localeCompare(getStudentName(b)),
        place: a.place.localeCompare(b.place),
        status: a.queueStatus.localeCompare(b.queueStatus),
        date: safeDate(a.updatedAt || a.createdAt).getTime() - safeDate(b.updatedAt || b.createdAt).getTime(),
      };

      return values[sortKey] * direction;
    });
  }, [rows, search, sortDirection, sortKey, statusFilter]);

  const analytics = useMemo(() => {
    const approved = rows.filter((row) => row.queueStatus === "Approved").length;
    const rejected = rows.filter((row) => row.queueStatus === "Rejected").length;
    const pending = passes.length;
    const active = rows.filter((row) => row.status === "Active" || row.status === "Out").length;
    const total = rows.length;
    const approvalRate = total ? Math.round((approved / total) * 100) : 0;

    return { approved, rejected, pending, active, total, approvalRate };
  }, [passes.length, rows]);

  const weeklyChart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        day: date.toLocaleDateString("en", { weekday: "short" }),
        Pending: 0,
        Approved: 0,
        Rejected: 0,
      };
    });

    rows.forEach((row) => {
      const key = safeDate(row.updatedAt || row.createdAt).toISOString().slice(0, 10);
      const bucket = days.find((day) => day.key === key);
      if (bucket) bucket[row.queueStatus] += 1;
    });

    return days;
  }, [rows]);

  const destinationChart = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(row.place || "Unknown", (counts.get(row.place || "Unknown") || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([place, count]) => ({ place, count }));
  }, [rows]);

  const statusChart = [
    { name: "Pending", value: analytics.pending, color: "#f59e0b" },
    { name: "Approved", value: analytics.approved, color: "#10b981" },
    { name: "Rejected", value: analytics.rejected, color: "#f43f5e" },
  ];

  const selectedHistory = useMemo(() => {
    if (!selectedRequest) return [];
    const email = selectedRequest.user?.email;
    const phone = selectedRequest.phone;
    return rows.filter((row) => (email && row.user?.email === email) || row.phone === phone);
  }, [rows, selectedRequest]);

  const monthDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = first.getDay();
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [calendarDate]);

  const calendarRequests = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      const key = safeDate(row.createdAt).toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [rows]);

  const exportRows = (type: "csv" | "excel") => {
    const header = ["Student", "Email", "Phone", "Place", "Purpose", "Time Out", "Time In", "Approval", "Status", "Updated"];
    const body = filteredRows.map((row) => [
      getStudentName(row),
      row.user?.email || "",
      row.phone,
      row.place,
      row.purpose,
      row.timeOut,
      row.timeIn,
      row.queueStatus,
      row.status || "Pending",
      new Date(row.updatedAt || row.createdAt).toLocaleString(),
    ]);
    const content = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");
    const extension = type === "excel" ? "xls" : "csv";
    const mime = type === "excel" ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8";
    downloadBlob(`admin-passes-${new Date().toISOString().slice(0, 10)}.${extension}`, content, mime);
  };

  const exportPdf = () => {
    window.print();
  };

  const openView = (view: DashboardView) => {
    setActiveView(view);

    if (view === "requests") {
      setStatusFilter("Pending");
      setSortKey("date");
      setSortDirection("desc");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#e8eef1] p-4 sm:p-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[220px_1fr]">
          <div className="h-[720px] animate-pulse rounded-[28px] bg-slate-900/90" />
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-[28px] bg-white/70" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-44 animate-pulse rounded-[28px] bg-white/70" />
              <div className="h-44 animate-pulse rounded-[28px] bg-white/70" />
            </div>
            <div className="h-96 animate-pulse rounded-[28px] bg-white/70" />
          </div>
        </div>
      </div>
    );
  }

  const surfaceClass = darkMode
    ? "bg-[radial-gradient(circle_at_top_left,#334155,#111827_48%,#020617)] text-white"
    : "bg-[radial-gradient(circle_at_top_left,#f8edda,#e5eef2_46%,#d7c0ae)] text-slate-900";
  const panelClass = darkMode
    ? "border-white/10 bg-white/10 text-white"
    : "border-white/70 bg-white/58 text-slate-900";
  const solidPanelClass = darkMode
    ? "border-white/10 bg-slate-950/62 text-white"
    : "border-white/70 bg-[#f8f2e8]/84 text-slate-900";
  const mutedText = darkMode ? "text-white/62" : "text-slate-500";

  return (
    <div className={`min-h-screen px-3 py-4 transition-colors duration-300 sm:px-6 sm:py-8 ${surfaceClass}`}>
      <main className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-[28px] bg-[#111111] p-5 text-white shadow-2xl lg:min-h-[760px]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-300 text-slate-950">
              <GraduationCap size={20} />
            </span>
            <div>
              <p className="text-lg font-semibold">GateVault</p>
              <p className="text-xs text-white/46">Admin Console</p>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            {[
              { icon: LayoutDashboard, label: "Dashboard", view: "dashboard" as const },
              { icon: Clock, label: "Requests", view: "requests" as const },
              { icon: CalendarDays, label: "Calendar", view: "calendar" as const },
              { icon: FileSpreadsheet, label: "Reports", view: "reports" as const },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => openView(item.view)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${activeView === item.view ? "bg-white text-slate-950" : "text-white/66 hover:bg-white/10 hover:text-white"}`}>
                <item.icon size={17} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-10 rounded-3xl bg-white/8 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} /> Live Pulse</p>
            <p className="mt-2 text-xs leading-5 text-white/56">Queue refresh, exports, and approval history are all available from this console.</p>
            <button type="button" onClick={fetchPasses} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-950">
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
          <header className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl ${panelClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${mutedText}`}>Gate pass approvals</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Good morning, Admin</h1>
                <p className={`mt-2 max-w-2xl text-sm leading-6 ${mutedText}`}>
                  Approve regular gate passes, review logs, export reports, and jump into scanner operations from one desk.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setDarkMode((current) => !current)} className={`grid h-11 w-11 place-items-center rounded-2xl border ${panelClass}`}>
                  {darkMode ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button type="button" onClick={() => router.push("/admin/profile")} className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold ${panelClass}`}>
                  <User size={16} />
                  Profile
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {[
                { label: "Pending", value: analytics.pending, icon: Clock, tone: "bg-amber-300" },
                { label: "Approved", value: analytics.approved, icon: ShieldCheck, tone: "bg-emerald-300" },
                { label: "Rejected", value: analytics.rejected, icon: X, tone: "bg-rose-300" },
                { label: "Approval rate", value: `${analytics.approvalRate}%`, icon: Sparkles, tone: "bg-sky-300" },
              ].map((card) => (
                <article key={card.label} className={`rounded-3xl border p-4 backdrop-blur-xl ${solidPanelClass}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${mutedText}`}>{card.label}</p>
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

          {activeView === "dashboard" && (
            <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
              <article className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl ${panelClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Approval Trend</h2>
                    <p className={`text-sm ${mutedText}`}>Last seven days by approval status</p>
                  </div>
                  <button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                    <Download size={15} />
                    PDF
                  </button>
                </div>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyChart}>
                      <defs>
                        <linearGradient id="adminApprovedGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"} vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: darkMode ? "#d1d5db" : "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: darkMode ? "#d1d5db" : "#475569", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="Approved" stroke="#10b981" fill="url(#adminApprovedGradient)" strokeWidth={3} />
                      <Area type="monotone" dataKey="Pending" stroke="#f59e0b" fill="#f59e0b33" strokeWidth={2} />
                      <Area type="monotone" dataKey="Rejected" stroke="#f43f5e" fill="#f43f5e22" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl ${panelClass}`}>
                <h2 className="text-lg font-semibold">Status Mix</h2>
                <p className={`text-sm ${mutedText}`}>Current queue and history split</p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusChart} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={4}>
                        {statusChart.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>
          )}

          {(activeView === "dashboard" || activeView === "requests") && (
            <section className={`grid gap-4 ${activeView === "dashboard" ? "xl:grid-cols-[0.84fr_1fr]" : "xl:grid-cols-1"}`}>
              {activeView === "dashboard" && (
                <article className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl ${panelClass}`}>
                  <h2 className="text-lg font-semibold">Top Destinations</h2>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={destinationChart} layout="vertical" margin={{ left: 8, right: 20 }}>
                        <CartesianGrid stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"} horizontal={false} />
                        <XAxis type="number" hide allowDecimals={false} />
                        <YAxis type="category" dataKey="place" tick={{ fill: darkMode ? "#d1d5db" : "#475569", fontSize: 12 }} width={92} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#111827" radius={[0, 10, 10, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              )}

              <article className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl ${panelClass}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Enhanced Request Table</h2>
                    <p className={`text-sm ${mutedText}`}>Search, filter, sort, inspect, export, approve, or reject</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => exportRows("csv")} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
                      <Download size={15} />
                      CSV
                    </button>
                    <button type="button" onClick={() => exportRows("excel")} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                      <FileSpreadsheet size={15} />
                      Excel
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="relative min-w-[220px] flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, place, purpose" className="h-11 w-full rounded-2xl border border-slate-200 bg-white/82 pl-9 pr-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-pink-200" />
                  </div>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white/82 px-3 text-sm text-slate-900 outline-none">
                    {["All", "Pending", "Approved", "Rejected", "Active", "Out", "Returned", "Expired"].map((filterItem) => (
                      <option key={filterItem}>{filterItem}</option>
                    ))}
                  </select>
                  <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="h-11 rounded-2xl border border-slate-200 bg-white/82 px-3 text-sm text-slate-900 outline-none">
                    <option value="date">Sort by date</option>
                    <option value="student">Sort by student</option>
                    <option value="place">Sort by place</option>
                    <option value="status">Sort by status</option>
                  </select>
                  <button type="button" onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))} className={`grid h-11 w-11 place-items-center rounded-2xl border ${panelClass}`}>
                    <ArrowDownUp size={16} />
                  </button>
                </div>

                <div className="mt-4 max-h-[420px] overflow-auto rounded-3xl border border-white/40">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className={darkMode ? "bg-slate-950/80" : "bg-white/72"}>
                      <tr className={mutedText}>
                        <th className="px-4 py-3 font-semibold">Student</th>
                        <th className="px-4 py-3 font-semibold">Pass</th>
                        <th className="px-4 py-3 font-semibold">Contact</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={`${row.source}-${row._id}`} className={`border-t ${darkMode ? "border-white/8" : "border-slate-200/70"}`}>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => setSelectedRequest(row)} className="text-left">
                              <p className="font-semibold">{getStudentName(row)}</p>
                              <p className={`text-xs ${mutedText}`}>{row.user?.email || row.phone}</p>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{row.place}</p>
                            <p className={`text-xs ${mutedText}`}>{row.timeOut} to {row.timeIn} - {row.purpose}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{row.phone}</p>
                            <p className={`text-xs ${mutedText}`}>{row.user?.hostel || "-"} / {row.user?.room || "-"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.queueStatus === "Approved" ? "bg-emerald-100 text-emerald-700" : row.queueStatus === "Rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                              {row.queueStatus}
                            </span>
                            <p className={`mt-2 text-xs ${mutedText}`}>{row.status || "Pending"}</p>
                          </td>
                          <td className="px-4 py-3">
                            {row.queueStatus === "Pending" ? (
                              <div className="flex gap-2">
                                <button type="button" disabled={updatingId === row._id} onClick={() => decidePass(row._id, "approve")} className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white disabled:opacity-60">
                                  <Check size={16} />
                                </button>
                                <button type="button" disabled={updatingId === row._id} onClick={() => decidePass(row._id, "reject")} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-600 text-white disabled:opacity-60">
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setSelectedRequest(row)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold">
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRows.length === 0 && <div className={`p-8 text-center text-sm ${mutedText}`}>No requests match your filters.</div>}
                </div>
              </article>
            </section>
          )}

          {activeView === "calendar" && (
            <section className="grid gap-4 xl:grid-cols-[0.95fr_1fr]">
              <article className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl ${panelClass}`}>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className={`grid h-9 w-9 place-items-center rounded-xl border ${panelClass}`}>
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-center">
                    <p className="text-sm font-semibold">{calendarDate.toLocaleDateString("en", { month: "long", year: "numeric" })}</p>
                    <p className={`text-xs ${mutedText}`}>Calendar view</p>
                  </div>
                  <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className={`grid h-9 w-9 place-items-center rounded-xl border ${panelClass}`}>
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className={`mt-4 grid grid-cols-7 gap-1 text-center text-[11px] ${mutedText}`}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {monthDays.map((day, index) => {
                    const key = day?.toISOString().slice(0, 10);
                    const count = key ? calendarRequests.get(key) || 0 : 0;
                    return (
                      <div key={key || `blank-${index}`} className={`aspect-square rounded-xl p-1 text-center text-xs ${day ? panelClass : "opacity-0"}`}>
                        {day && <span>{day.getDate()}</span>}
                        {count > 0 && <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-pink-400" />}
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl ${panelClass}`}>
                <h2 className="text-lg font-semibold">Today&apos;s Timeline</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {rows.slice(0, 6).map((row) => (
                    <button key={`calendar-timeline-${row.source}-${row._id}`} type="button" onClick={() => setSelectedRequest(row)} className={`rounded-2xl border p-3 text-left ${solidPanelClass}`}>
                      <p className="text-sm font-semibold">{getStudentName(row)}</p>
                      <p className={`mt-1 text-xs ${mutedText}`}>{row.place} - {row.queueStatus}</p>
                    </button>
                  ))}
                  {rows.length === 0 && <p className={`text-sm ${mutedText}`}>No timeline items yet.</p>}
                </div>
              </article>
            </section>
          )}

          {activeView === "reports" && (
            <section className="grid gap-4 xl:grid-cols-3">
              <article className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl ${panelClass}`}>
                <h2 className="text-lg font-semibold">Refresh Queue</h2>
                <p className={`mt-2 text-sm ${mutedText}`}>Pull the latest admin requests and logs from the server.</p>
                <button type="button" onClick={fetchPasses} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                  <RefreshCw size={16} />
                  Refresh live queue
                </button>
              </article>
              <article className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl ${panelClass}`}>
                <h2 className="text-lg font-semibold">Excel Export</h2>
                <p className={`mt-2 text-sm ${mutedText}`}>Download the current filtered table as an Excel-readable file.</p>
                <button type="button" onClick={() => exportRows("excel")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
                  <FileSpreadsheet size={16} />
                  Export Excel
                </button>
              </article>
              <article className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl ${panelClass}`}>
                <h2 className="text-lg font-semibold">PDF Export</h2>
                <p className={`mt-2 text-sm ${mutedText}`}>Open the browser print dialog for a PDF dashboard snapshot.</p>
                <button type="button" onClick={exportPdf} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white">
                  <Download size={16} />
                  Export PDF
                </button>
              </article>
            </section>
          )}
        </section>
      </main>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/58 p-4 backdrop-blur-sm">
          <section className={`max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[28px] border p-6 shadow-2xl ${darkMode ? "border-white/10 bg-slate-950 text-white" : "border-white/70 bg-white text-slate-900"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${mutedText}`}>Pass request</p>
                <h2 className="mt-1 text-2xl font-semibold">{getStudentName(selectedRequest)}</h2>
                <p className={`mt-1 text-sm ${mutedText}`}>{selectedRequest.user?.email || selectedRequest.phone}</p>
              </div>
              <button type="button" onClick={() => setSelectedRequest(null)} className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white">
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Status", value: selectedRequest.queueStatus },
                { label: "History", value: selectedHistory.length },
                { label: "Room", value: `${selectedRequest.user?.hostel || "-"} / ${selectedRequest.user?.room || "-"}` },
              ].map((item) => (
                <div key={item.label} className={darkMode ? "rounded-2xl bg-white/10 p-4" : "rounded-2xl bg-slate-100 p-4"}>
                  <p className={`text-xs ${mutedText}`}>{item.label}</p>
                  <p className="mt-1 font-semibold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200/60 p-4">
              <h3 className="font-semibold">Current request</h3>
              <p className={`mt-2 text-sm leading-6 ${mutedText}`}>
                {selectedRequest.purpose} at {selectedRequest.place}. Pass window {selectedRequest.timeOut} to {selectedRequest.timeIn}. Requested on {formatDate(selectedRequest.createdAt)}.
              </p>
              {(selectedRequest.person || selectedRequest.personPhone) && (
                <p className={`mt-2 text-sm ${mutedText}`}>Accompanying: {selectedRequest.person || "Unknown"} {selectedRequest.personPhone ? `- ${selectedRequest.personPhone}` : ""}</p>
              )}
            </div>

            <div className="mt-5">
              <h3 className="font-semibold">History</h3>
              <div className="mt-3 space-y-2">
                {selectedHistory.map((item) => (
                  <div key={`history-${item.source}-${item._id}`} className={darkMode ? "rounded-2xl bg-white/10 p-3" : "rounded-2xl bg-slate-100 p-3"}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{item.place}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.queueStatus === "Approved" ? "bg-emerald-100 text-emerald-700" : item.queueStatus === "Rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {item.queueStatus}
                      </span>
                    </div>
                    <p className={`mt-1 text-xs ${mutedText}`}>{formatDate(item.createdAt)} - {item.purpose}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
