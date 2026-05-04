"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ArrowLeft, Camera, GraduationCap, LayoutDashboard, LogOut, Mail, Phone, Save, ShieldCheck, Sparkles, User } from "lucide-react";
import { PageSkeleton } from "@/components/LoadingSkeleton";

type RoleProfileUser = {
  name: string;
  email: string;
  phone: string;
  role: string;
  image: string;
};

function avatarSrc(src: string, version: number) {
  if (!src || src === "/set2.png") {
    return "/set2.png";
  }

  return `${src}${src.includes("?") ? "&" : "?"}v=${version}`;
}

type RoleProfilePageProps = {
  allowedRoles: string[];
  dashboardHref: string;
  eyebrow: string;
  title: string;
  dashboardStyle?: boolean;
  consoleLabel?: string;
  profileNote?: string;
};

export function RoleProfilePage({ allowedRoles, dashboardHref, eyebrow, title, dashboardStyle = false, consoleLabel = "HOD Console", profileNote = "Manage your account details from the same console style as the approval dashboard." }: RoleProfilePageProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<RoleProfileUser>({
    name: "",
    email: "",
    phone: "",
    role: "",
    image: "/set2.png",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status !== "authenticated") {
      return;
    }

    const loadUser = async () => {
      try {
        const res = await fetch(`/api/user?ts=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        const profile = data.user;
        const sessionUser = session?.user;

        setUser({
          name: profile?.name || sessionUser?.name || "",
          email: profile?.email || sessionUser?.email || "",
          phone: profile?.phone || "",
          role: profile?.role || "",
          image: profile?.avatar || "/set2.png",
        });
      } catch {
        setMessage("Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadUser();
  }, [status, session, router]);

  const canView = allowedRoles.includes(user.role);

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 150 * 1024) {
      setMessage("Image too large. Max 150KB allowed.");
      return;
    }

    setUploadingAvatar(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/user", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to update profile photo");
        return;
      }

      setUser((current) => ({
        ...current,
        image: data.user.avatar || current.image,
      }));
      setAvatarVersion(Date.now());
      event.target.value = "";
      setMessage(data.message || "Profile photo updated successfully");
    } catch {
      setMessage("Something went wrong");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: user.phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to update profile");
        return;
      }

      setUser((current) => ({ ...current, phone: data.user.phone || "" }));
      setMessage(data.message || "Profile updated successfully");
    } catch {
      setMessage("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loadingProfile) {
    return <PageSkeleton />;
  }

  if (!canView) {
    return (
      <div className="campus-dashboard px-4 py-6 text-gray-800">
        <main className="mx-auto max-w-3xl rounded-lg bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto text-red-500" size={36} />
          <h1 className="mt-4 text-xl font-semibold">Access required</h1>
          <p className="mt-2 text-sm text-gray-500">This profile is linked to a different dashboard role.</p>
          <button
            type="button"
            onClick={() => router.push(dashboardHref)}
            className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  if (dashboardStyle) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8edda,#e5eef2_46%,#d7c0ae)] px-3 py-4 text-slate-900 transition-colors duration-300 sm:px-6 sm:py-8">
        <main className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-[28px] bg-[#111111] p-5 text-white shadow-2xl lg:min-h-[760px]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-300 text-slate-950">
                <GraduationCap size={20} />
              </span>
              <div>
                <p className="text-lg font-semibold">GateVault</p>
                <p className="text-xs text-white/46">{consoleLabel}</p>
              </div>
            </div>

            <nav className="mt-10 space-y-2">
              <button
                type="button"
                onClick={() => router.push(dashboardHref)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/66 transition hover:bg-white/10 hover:text-white"
              >
                <LayoutDashboard size={17} />
                Dashboard
              </button>
              <div className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-slate-950">
                <User size={17} />
                Profile
              </div>
            </nav>

            <div className="mt-10 rounded-3xl bg-white/8 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles size={16} />
                Profile Desk
              </p>
              <p className="mt-2 text-xs leading-5 text-white/56">Keep your contact number current for approval notifications and account recovery.</p>
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-8 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/66 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={17} />
              Log out
            </button>
          </aside>

          <section className="min-w-0 space-y-4">
            <header className="rounded-[28px] border border-white/70 bg-white/58 p-5 text-slate-900 shadow-xl backdrop-blur-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {profileNote}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(dashboardHref)}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/70 bg-white/58 px-4 text-sm font-semibold text-slate-900"
                >
                  <ArrowLeft size={16} />
                  Dashboard
                </button>
              </div>
            </header>

            <section className="grid gap-4 xl:grid-cols-[0.78fr_1fr]">
              <article className="rounded-[28px] border border-white/70 bg-[#f8f2e8]/84 p-5 text-slate-900 shadow-xl backdrop-blur-2xl">
                <div className="flex flex-col items-center text-center">
                  <div className="relative h-28 w-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={user.image}
                      src={avatarSrc(user.image, avatarVersion)}
                      alt="profile"
                      className="h-full w-full rounded-[28px] border-4 border-white object-cover shadow-xl"
                    />
                    <label className="absolute -bottom-2 -right-2 grid h-11 w-11 cursor-pointer place-items-center rounded-2xl bg-pink-400 text-slate-950 shadow-lg transition hover:scale-105">
                      <Camera size={17} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingAvatar}
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>

                  <h2 className="mt-6 text-2xl font-semibold">{user.name || "HOD"}</h2>
                  <p className="mt-1 break-words text-sm text-slate-500">{user.email}</p>
                  <span className="mt-4 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-500">{user.role || "hod"}</span>
                </div>

                {message && (
                  <div className={`mt-5 rounded-2xl px-3 py-2 text-center text-sm ${message.includes("successfully") ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {message}
                  </div>
                )}
              </article>

              <article className="rounded-[28px] border border-white/70 bg-white/58 p-5 text-slate-900 shadow-xl backdrop-blur-2xl">
                <div>
                  <h2 className="text-lg font-semibold">Account Details</h2>
                  <p className="mt-1 text-sm text-slate-500">Your identity fields are read-only. Phone number can be updated.</p>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-3xl border border-white/70 bg-[#f8f2e8]/84 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <User size={16} />
                      <p className="text-xs font-semibold uppercase">Full Name</p>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{user.name}</p>
                  </div>

                  <div className="rounded-3xl border border-white/70 bg-[#f8f2e8]/84 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail size={16} />
                      <p className="text-xs font-semibold uppercase">Email</p>
                    </div>
                    <p className="mt-2 break-words text-sm font-semibold">{user.email}</p>
                  </div>

                  <label className="block rounded-3xl border border-white/70 bg-[#f8f2e8]/84 p-4">
                    <span className="flex items-center gap-2 text-slate-500">
                      <Phone size={16} />
                      <span className="text-xs font-semibold uppercase">Phone Number</span>
                    </span>
                    <input
                      value={user.phone}
                      onChange={(event) =>
                        setUser((current) => ({
                          ...current,
                          phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                        }))
                      }
                      placeholder="9876543210"
                      className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </article>
            </section>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="campus-dashboard px-4 py-6 text-gray-800">
      <main className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-4xl items-center justify-center">
        <section className="w-full max-w-xl rounded-lg border border-gray-200 bg-white p-6 text-gray-800 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push(dashboardHref)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100"
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>

          <div className="mt-8 flex flex-col items-center text-center">
            <div className="relative h-24 w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={user.image}
                src={avatarSrc(user.image, avatarVersion)}
                alt="profile"
                className="h-full w-full rounded-full border-2 border-orange-300 object-cover shadow-md"
              />
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-orange-500 p-2 text-white shadow-md transition hover:scale-105">
                <Camera size={14} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={handleImageChange}
                />
              </label>
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-orange-600">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">{user.name}</p>
          </div>

          {message && (
            <div className={`mt-5 rounded-lg px-3 py-2 text-center text-sm ${message.includes("successfully") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {message}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500">
                <User size={16} />
                <p className="text-xs">Full Name</p>
              </div>
              <p className="mt-1 text-sm font-medium">{user.name}</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500">
                <Mail size={16} />
                <p className="text-xs">Email</p>
              </div>
              <p className="mt-1 text-sm font-medium">{user.email}</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500">
                <Phone size={16} />
                <p className="text-xs">Phone Number</p>
              </div>
              <input
                value={user.phone}
                onChange={(event) =>
                  setUser((current) => ({
                    ...current,
                    phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                placeholder="9876543210"
                className="mt-1 w-full bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </section>
      </main>
    </div>
  );
}
